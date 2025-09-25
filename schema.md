## Database Relationship Diagram

```ascii
┌─────────────┐                        ┌─────────────┐
│   Program   │                        │    User     │
├─────────────┤                        ├─────────────┤
│ id          │                        │ id          │
│ programName │                        │ email       │
│ deadline    │                        │ name        │
│ website     │                        │ createdAt   │
|             │                        │ updatedAt   │
└─────────────┤                        └─────────────┤
       │                                      │
       │                                      │
       └───────────────--─────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   Application   │
              ├─────────────────┤
              │ id              │
              │ userId          │
              │ programId       │
              │ programName     │
              │ deadline        │
              │ status          │
              └─────────────────┤
                       │
                       ▼
              ┌─────────────────┐    ┌──────────────┐
              │      Task       │◄───┤  TaskType    │
              ├─────────────────┤    ├──────────────┤
              │ id              │    │ id           │
              │ applicationId   │    │ name         │
              │ taskTypeId      │    │ description  │
              │ title           │    │ defaultTime  │
              │ status          │    └──────────────┘
              │ timeEstimate    │
              └─────────────────┤
                       │
                       ▼
              ┌─────────────────┐
              │  ProgressLog    │
              └─────────────────┘
```

model Program {
    id String @id @default(cuid())
    programName String
    deadline DateTime
    website String // ( url of application details )
    
}

model User {
    id            String   @id @default(cuid())
    email         String   @unique
    name          String?
    applications  Application[]
    logs          ProgressLog[]
    createdAt     DateTime @default(now())
    updatedAt     DateTime @updatedAt
}

model TaskType {
    id          String   @id @default(cuid())
    type        String   @unique // 'essay-draft', 'essay-final', 'timebox', 'notification'
    defaultTime Integer? // in hours: timebox=2, draft=2, final=1, notification=null
    
}

model Task {
    id            String       @id @default(cuid())
    applicationId String
    taskTypeId    String
    title         String
    description   String?
    status        String       @default("pending") // pending, in_progress, completed, overdue
    dueDate       DateTime?
    timeEstimate  Integer?     // in hours
    completedAt   DateTime?
    logs          ProgressLog[]
    application   Application  @relation(fields: [applicationId], references: [id])
    taskType      TaskType     @relation(fields: [taskTypeId], references: [id])
    createdAt     DateTime     @default(now())
    updatedAt     DateTime     @updatedAt
}



model Application {
    id          String   @id @default(cuid())
    userId      String
    programId   String?
    schoolName  String
    deadline    DateTime
    status      String   @default("not_started") // not_started, in_progress, completed
    tasks       Task[]
    user        User     @relation(fields: [userId], references: [id])
    program     Program? @relation(fields: [programId], references: [id])
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
}

