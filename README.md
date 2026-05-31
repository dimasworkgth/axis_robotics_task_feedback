# AXIS Task Feedback Board

A public feedback layer for AXIS Robotics tasks.

This project is designed to help contributors give structured feedback directly on each AXIS task, without using a generic feedback form or manually choosing which task the feedback belongs to.

## Why This Matters

AXIS tasks are dynamic. A task can appear, get completed, become full, or disappear from the live task list.

Without a dedicated feedback layer, useful contributor feedback can easily be lost because:

* Contributors may not know where to report unclear task instructions
* Feedback can become scattered across chats, comments, or social platforms
* The team may not know which task a specific feedback message refers to
* Completed or disappeared tasks may no longer have an accessible place for review
* Repeated issues across tasks are harder to track and improve

This board helps turn task feedback into a structured and reviewable system.

## Core Idea

Each task gets its own feedback room.

When a user opens a task, the feedback form is automatically connected to that task. The user only needs to enter:

* Name or username
* Feedback category
* Message

The system handles the task connection in the background.

Users do not need to select the task manually.

## How It Works

The board reads task information from the AXIS task source and stores the task identity in its own catalog.

A saved task identity may include:

* Task ID
* Task title
* Task description
* Task progress or slot information
* Task source metadata
* Collection time

Once the task identity is saved, the board can keep a feedback room available for that task even if the original task is no longer visible in the live task source.

This makes the feedback history more stable and easier to review.

## User Flow

```txt
User opens the feedback board
        ↓
User sees collected AXIS tasks
        ↓
User opens one task
        ↓
User enters the task feedback room
        ↓
User reads the task context
        ↓
User submits feedback
        ↓
Feedback is saved under that specific task
        ↓
The team can review feedback by task
```

## Feedback Flow

Each feedback item is linked to one task.

A feedback item contains:

* Task reference
* Username
* Category
* Message
* Timestamp

The task reference is handled automatically by the system.

This keeps feedback clean, organized, and attached to the correct task.

## Feedback Categories

The current feedback categories are intentionally simple:

* Suggestion
* Bug
* Criticism

This keeps the form easy to use while still giving the team enough context to understand the type of feedback being submitted.

## Contributor Experience

The contributor does not need to understand how the task data is stored.

From the user side, the flow is simple:

1. Open a task
2. Read the task details
3. Write feedback
4. Submit

The system is designed to feel like giving feedback inside the task itself, not filling out a separate external report.

## Team Benefit

This board can help the AXIS team:

* Review feedback per task
* Identify unclear task instructions
* Track recurring task issues
* Improve future task quality
* Separate useful feedback from social noise
* Keep feedback available even after the task is no longer active
* Build a more transparent contributor feedback loop

## Design Direction

The interface is designed to be simple, focused, and contributor-friendly.

The main goal is not to overload the page with too many tools, but to create a clean feedback experience around each task.

Key design principles:

* Clear task context
* Separated feedback form and feedback list
* Minimal category choices
* Comfortable dark interface
* AXIS Robotics visual identity
* Simple navigation between task list, task room, and feedback history

## Current Scope

This repository focuses on the public contributor-facing feedback board.

The public board includes:

* Task collection
* Task catalog
* Task room
* Feedback submission
* Feedback preview
* Full feedback list per task
* Basic duplicate submission protection

The admin review system is intentionally kept separate so the public experience remains clean and simple.

## Future Improvements

Possible future additions:

* Dedicated admin review dashboard
* Feedback moderation status
* Feedback export
* Search and filtering
* Contributor authentication
* Feedback analytics
* Task quality summary
* Repeated issue detection
* Discord or X integration

## Credit

Built by [NPCCRYPTO](https://t.me/NPCKRIPTO).

