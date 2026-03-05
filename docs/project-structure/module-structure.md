# Module Structure & Data Flow

The RAG CV Builder project adopts **Clean Architecture** and **Domain-Driven Design (DDD)**. By adhering to this architecture, we ensure that Business Logic (the application core) is entirely independent of external libraries (HTTP frameworks, ORM Databases), making the system easy to scale and maintain.

This document explains the detailed structure of a typical Module and describes the journey of a Request from the moment a user sends it until processing is complete.

---

## 1. Detailed Directory Structure of a Module

Each module (e.g., `src/modules/user` or `src/modules/resume`) is divided into 4 main directories, representing the 4 layers of Clean Architecture:

```text
src/modules/user/
├── domain/            # 1. Domain Layer (Innermost core)
├── application/       # 2. Application Layer
├── infrastructure/    # 3. Infrastructure Layer
└── presentation/      # 4. Presentation Layer (Interface)
```

### Roles of Each Layer (from inner to outer)

| Layer              | Common Sub-directories                                 | Role & Characteristics                                                                                                                                                                                                                                                                                                                     |
| :----------------- | :----------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Domain**         | `entities/`, `events/`, `exceptions/`                  | The **heart** of the software. Contains pure business concepts (e.g., `User` class containing the `isProfileComplete()` behavior).<br>👉 **Golden Rule:** ABSOLUTELY DO NOT import any framework libraries (NestJS, Prisma, Express) here. Use pure TypeScript only.                                                                       |
| **Application**    | `services/`, `commands/`, `interfaces/`, `strategies/` | The **coordinating brain**. Contains Use Cases (e.g., Business logic to Create a new User). It defines the Interfaces/Contracts (e.g., `IUserRepository`) that outer layers must implement.<br>👉 **Golden Rule:** Only allowed to call down to the Domain layer. Must not know what a Database is, nor what HTTP/REST is.                 |
| **Infrastructure** | `repositories/`, `adapters/`                           | The **hands and feet** communicating with the outside world. Contains implementations of the Application layer's Interfaces (e.g., `PrismaUserRepository` performs insertions into the DB via Prisma).<br>👉 **Golden Rule:** The only place containing code tightly coupled with the Database (Prisma) or 3rd-party APIs (Gemini, Clerk). |
| **Presentation**   | `controllers/`, `DTOs/`, `guards/`, `interceptors/`    | The **gateway** communicating with the Client. Contains Controllers capturing HTTP Requests, and DTO classes used to validate input data. <br>👉 **Golden Rule:** Its sole duty is to transform HTTP Request data into `Command` objects and push them into the Application layer for processing. Should contain no business logic.        |

---

## 2. Why do we need `Commands` in the Application layer when we already have `DTOs` in the Presentation layer?

A common question is why we create `CreateUserDto` (in the Presentation layer) and then also create `CreateUserCommand` (in the Application layer) possessing almost identical fields.

**Reason:** This is about **Separation of Concerns**.

- **DTO (Data Transfer Object):** Exists to "catch" data from an HTTP Request. A DTO contains many framework decorators like `@IsString()`, `@ApiProperty()`. If the Application layer used DTOs directly, your Core Logic would be tightly coupled to `class-validator` and NestJS.
- **Command:** Exists to serve as pure Input for the Application Core. It is a clean Data Structure, containing no HTTP decorators. The Controller is responsible for "stripping" the HTTP shell off the DTO, transforming it into a Command to feed into the Service. Consequently, if the project later stops using REST API and switches to gRPC or Cronjobs, the Core Logic remains completely unaffected.

---

## 3. The Journey of a Request (Data Flow)

Example: A Client sends an HTTP Request `POST /users` with the body `{ "email": "admin@x.com", "firstName": "John" }` to create an account.

The journey of the Request occurs in the following steps, moving from the outside in and then back out:

### 🚪 STEP 1: Passing Through the Security Gates (Presentation Layer)

1.  **Encountering Guard:** The request passes through `ClerkAuthGuard`. This guard checks the `Authorization: Bearer <token>` header for validity. If invalid, it immediately throws an HTTP `401 Unauthorized` error.
2.  **Encountering Validation Pipe:** The JSON Body data hits `CreateUserDto`. The `class-validator` library checks if "the email format is correct". If wrong, it throws an HTTP `400 Bad Request` error. If correctly formatted, it lets the request proceed.

### 🛃 STEP 2: Reception Processing (Presentation Layer)

3.  **Encountering Controller:** The request enters `UserController` (the `@Post()` method).
    - The Controller extracts the clean data from the DTO.
    - It **transforms (Maps)** the data from `CreateUserDto` into a pure `CreateUserCommand`.
    - The Controller calls: `this.userService.create(command)` to hand off the work to the core.

### 🧠 STEP 3: Business Processing (Application & Domain Layers)

4.  **Encountering Service (Use Case):** The execution flow enters `UserService`.
    - The Service checks business rules: "Does this user already exist in the DB?". It issues a command via an interface: `await this.userRepository.findByEmail(...)`.
    - If the user exists, the Service immediately throws a `ConflictException` (Account already exists).
    - If the user does not exist, the Service issues the next command: `await this.userRepository.create(...)`.
    - _Note:_ The Service has not touched the Database; it only "directs" via Dependency Injection.

### 🏭 STEP 4: Execution at the Warehouse (Infrastructure Layer)

5.  **Executing Repository Adapter:** The `create(...)` command is passed to `PrismaUserRepository` (the actual class implementing `IUserRepository`).
    - Here, the data is finally converted into an SQL statement via `PrismaService`.
    - The Database executes the INSERT statement and returns the result.
    - **Important:** The Repository does one final thing — it molds the received SQL result back into a clean, standard **Domain Entity** (`new User(...)`) and throws it back to the Service.

### 📤 STEP 5: The Return Journey

6.  **At the Service:** After successful creation, the Service might broadcast an announcement (Domain Event): `this.eventEmitter.emit('user.created', user)`. A listening system (e.g., `ResumeModule`) will automatically generate a default CV for this user in the Background. Afterward, the Service returns the Model (Entity) to the Controller.
7.  **At the Controller/Interceptor:** The Controller receives the result. It transforms the Entity into a JSON DTO Response, stripping out sensitive fields (like a Password Hash). It returns the JSON result `{ "id": 1, "email": "..." }` to the Client along with the HTTP `201 Created` status code.

### 🔄 Summary Diagram of a Create Task Flow

```text
Client (Browser/App)
    │
    ▼ (HTTP Request, JSON)
[Guards & Validation Pipes]  <── (Presentation Layer)
    │
    ▼
[UserController]             <── Parse, Map DTO → Command
    │
    ▼ (Command)
[UserService]                <── (Application Layer) Checks Business Rules, triggers Event
    │
    ▼ (Calls IUserRepository Interface)
[PrismaUserRepository]       <── (Infrastructure Layer)
    │
    ▼ (Prisma Query -> SQL)
[PostgreSQL Database]        <── Execution
    │
    ▼ (Returns DB Result)
[PrismaUserRepository]       <── Parses DB Result → Domain Entity (e.g., new User())
    │
    ▼ (Domain Entity)
[UserService]                <── Returns Domain Entity
    │
    ▼ (Domain Entity)
[UserController]             <── Maps Domain Entity → Response JSON
    │
    ▼ (HTTP Response 201)
Client
```

This model ensures the outer shell can continuously adapt (Web, App, CLI, different Databases) while the inner core of the application remains pristine and stable.
