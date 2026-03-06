import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { type StartInterviewCommand } from '@/modules/interview/application/commands';
import { InterviewService } from '@/modules/interview/application/services/interview.service';
import { InterviewEvaluationService } from '@/modules/interview/application/services/interview-evaluation.service';
import { type StartInterviewDto } from '@/modules/interview/presentation/DTOs';
import { WsAuthGuard } from '@/modules/interview/presentation/guards/ws-auth.guard';
import { ResumeService } from '@/modules/resume/application/services/resume.service';

@WebSocketGateway({
  namespace: '/interview',
  cors: {
    origin: process.env.FRONTEND_ORIGIN ?? '*',
    credentials: true,
  },
})
export class InterviewGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(InterviewGateway.name);

  /** Maps socket ID → interview session ID */
  private readonly clientSessions = new Map<string, string>();

  constructor(
    private readonly interviewService: InterviewService,
    private readonly evaluationService: InterviewEvaluationService,
    private readonly resumeService: ResumeService,
    private readonly wsAuthGuard: WsAuthGuard,
  ) {}

  // ─── Lifecycle ──────────────────────────────────────────────

  async handleConnection(client: Socket): Promise<void> {
    const userId = await this.wsAuthGuard.authenticate(client);

    if (!userId) {
      client.emit('interview:error', { message: 'Authentication failed' });
      client.disconnect();
      return;
    }

    Object.assign(client.data, { userId });
    this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    this.logger.log(`Client disconnected: ${client.id}`);

    const sessionId = this.clientSessions.get(client.id);
    if (sessionId) {
      await this.interviewService.cancelInterview(sessionId);
      this.clientSessions.delete(client.id);
    }
  }

  // ─── Message Handlers ──────────────────────────────────────

  @SubscribeMessage('interview:start')
  async handleStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: StartInterviewDto,
  ): Promise<void> {
    try {
      const userId = client.data.userId as string;

      if (!userId) {
        client.emit('interview:error', { message: 'Not authenticated' });
        return;
      }

      // Prevent multiple concurrent interviews per client
      if (this.clientSessions.has(client.id)) {
        client.emit('interview:error', {
          message: 'An interview is already in progress',
        });
        return;
      }

      // Get the latest resume for this user
      const resume = await this.resumeService.findByUserId(userId);
      const resumeJson = resume ? JSON.stringify(resume) : '{}';

      const command: StartInterviewCommand = {
        userId,
        clientSocketId: client.id,
        resumeJson,
        jobDescription: dto.jobDescription,
        questionCount: dto.questionCount,
        interviewType: dto.interviewType,
      };

      const session = await this.interviewService.startInterview(command, {
        onAudioResponse: (audioData) => {
          this.logger.debug(
            `Emitting audio to client ${client.id}: ${audioData.length} bytes`,
          );
          client.emit('interview:audio', {
            audio: audioData.toString('base64'),
          });
        },
        onTurnComplete: (data) => {
          client.emit('interview:turn-complete', data);
        },
        onInterrupted: () => {
          client.emit('interview:interrupted');
        },
        onInterviewComplete: () => {
          void this.handleInterviewComplete(client);
        },
      });

      this.clientSessions.set(client.id, session.id);

      client.emit('interview:started', { sessionId: session.id });
      this.logger.log(
        `Interview started: ${session.id} (client: ${client.id})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to start interview: ${error instanceof Error ? error.message : String(error)}`,
      );
      client.emit('interview:error', {
        message: 'Failed to start interview. Please try again.',
      });
    }
  }

  @SubscribeMessage('interview:audio')
  handleAudio(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { audio: string },
  ): void {
    const sessionId = this.clientSessions.get(client.id);
    if (!sessionId) return;

    const audioBuffer = Buffer.from(data.audio, 'base64');
    this.logger.debug(
      `Received audio from client ${client.id}: ${audioBuffer.length} bytes`,
    );
    this.interviewService.handleAudioInput(sessionId, audioBuffer);
  }

  @SubscribeMessage('interview:stop')
  async handleStop(@ConnectedSocket() client: Socket): Promise<void> {
    await this.handleInterviewComplete(client);
  }

  // ─── Private ────────────────────────────────────────────────

  private async handleInterviewComplete(client: Socket): Promise<void> {
    try {
      const sessionId = this.clientSessions.get(client.id);
      if (!sessionId) return;

      const session = this.interviewService.getSession(sessionId);
      if (!session) return;

      // End the live interview session
      const completedSession =
        await this.interviewService.endInterview(sessionId);
      if (!completedSession) return;

      // Notify client that evaluation is in progress
      this.logger.log(`Evaluating interview: ${sessionId}`);
      client.emit('interview:evaluating');

      // Evaluate & send feedback
      const feedback = await this.evaluationService.evaluate(completedSession);

      client.emit('interview:feedback', feedback);
      this.clientSessions.delete(client.id);

      this.logger.log(`Interview feedback sent: ${sessionId}`);
    } catch (error) {
      this.logger.error(
        `Failed to complete interview: ${error instanceof Error ? error.message : String(error)}`,
      );
      client.emit('interview:error', {
        message: 'Failed to evaluate interview. Please try again.',
      });
    }
  }
}
