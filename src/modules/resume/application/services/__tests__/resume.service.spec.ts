import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { RESUME_REPOSITORY_TOKEN } from '@/modules/resume/application/interfaces';
import { ResumeService } from '@/modules/resume/application/services/resume.service';
import { Resume } from '@/modules/resume/domain';

describe('ResumeService', () => {
  let service: ResumeService;

  const mockResumeRepository = {
    update: jest.fn(),
    findById: jest.fn(),
    findOwner: jest.fn(),
    findByUserId: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeService,
        {
          provide: RESUME_REPOSITORY_TOKEN,
          useValue: mockResumeRepository,
        },
      ],
    }).compile();

    service = module.get<ResumeService>(ResumeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUserId', () => {
    it('should return a resume if found', async () => {
      const mockResume = new Resume({ id: '1', userId: 'user-1' } as any);
      mockResumeRepository.findByUserId.mockResolvedValue(mockResume);

      const result = await service.findByUserId('user-1');

      expect(mockResumeRepository.findByUserId).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockResume);
    });

    it('should return null if not found', async () => {
      mockResumeRepository.findByUserId.mockResolvedValue(null);

      const result = await service.findByUserId('user-1');

      expect(result).toBeNull();
    });
  });

  describe('findById (findAndAuthorize)', () => {
    it('should return the resume if it exists and belongs to the user', async () => {
      const mockResume = new Resume({
        id: 'resume-1',
        userId: 'user-1',
      } as any);
      mockResumeRepository.findById.mockResolvedValue(mockResume);

      const result = await service.findById('resume-1', 'user-1');

      expect(mockResumeRepository.findById).toHaveBeenCalledWith('resume-1');
      expect(result).toEqual(mockResume);
    });

    it('should throw NotFoundException if resume does not exist', async () => {
      mockResumeRepository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if resume belongs to another user', async () => {
      const mockResume = new Resume({
        id: 'resume-1',
        userId: 'user-2',
      } as any);
      mockResumeRepository.findById.mockResolvedValue(mockResume);

      await expect(service.findById('resume-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('should update the resume if authorized', async () => {
      const updatePayload = { title: 'Updated Title' } as any;

      mockResumeRepository.findOwner.mockResolvedValue({
        id: 'resume-1',
        userId: 'user-1',
      });
      mockResumeRepository.update.mockResolvedValue(
        new Resume({
          id: 'resume-1',
          userId: 'user-1',
          title: 'Updated Title',
        } as any),
      );

      const result = await service.update('resume-1', updatePayload, 'user-1');

      expect(mockResumeRepository.findOwner).toHaveBeenCalledWith('resume-1');
      expect(mockResumeRepository.update).toHaveBeenCalledWith(
        'resume-1',
        updatePayload,
      );
      expect(result.title).toBe('Updated Title');
    });

    it('should throw ForbiddenException if unauthorized during update', async () => {
      const updatePayload = { title: 'Updated Title' } as any;

      mockResumeRepository.findOwner.mockResolvedValue({
        id: 'resume-1',
        userId: 'user-2',
      });

      await expect(
        service.update('resume-1', updatePayload, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockResumeRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete the resume if authorized', async () => {
      mockResumeRepository.findOwner.mockResolvedValue({
        id: 'resume-1',
        userId: 'user-1',
      });
      mockResumeRepository.delete.mockResolvedValue(undefined);

      await service.delete('resume-1', 'user-1');

      expect(mockResumeRepository.findOwner).toHaveBeenCalledWith('resume-1');
      expect(mockResumeRepository.delete).toHaveBeenCalledWith('resume-1');
    });

    it('should throw ForbiddenException if unauthorized during delete', async () => {
      mockResumeRepository.findOwner.mockResolvedValue({
        id: 'resume-1',
        userId: 'user-2',
      });

      await expect(service.delete('resume-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockResumeRepository.delete).not.toHaveBeenCalled();
    });
  });
});
