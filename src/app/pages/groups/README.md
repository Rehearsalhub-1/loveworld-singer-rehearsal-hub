# Groups Module

This is a self-contained chat/groups module that can be easily extracted and used in other applications.

## Structure

```
src/app/pages/groups/
├── _components/           # All chat UI components
│   ├── ChatContainer.tsx
│   ├── ChatHeader.tsx
│   ├── ChatSidebar.tsx
│   ├── CreateGroupModal.tsx
│   ├── FriendRequestsModal.tsx
│   ├── MessageInput.tsx
│   ├── NoChatSelected.tsx
│   ├── UserSearchModal.tsx
│   └── index.ts          # Component exports
├── _context/             # Chat context and state management
│   ├── ChatContext.tsx
│   └── index.ts          # Context exports
├── _lib/                 # Chat services and utilities
│   ├── chat-types.ts
│   ├── chat-api-service.ts
│   ├── chat-api-helpers.ts
│   ├── chat-api-writes.ts
│   ├── chat-service.ts
│   └── index.ts          # Service exports
├── page.tsx              # Main groups page
├── index.ts              # Module main export
└── README.md             # This file
```

## Dependencies

### Internal (from main app)
- `@/hooks/useAuth` (Zustand auth store) - User authentication
- `@/hooks/useZone` (Zustand zone store) - Zone management
- JWT API client (`@/lib/api-client`) — primary data path
- Temporary Firestore client (`@/lib/firebase-setup`) — realtime listeners until WebSocket migration

### External
- `lucide-react` - Icons
- `date-fns` - Date formatting
- `react` - Core React functionality

## Usage

### In Main App
```tsx
import { ChatProvider } from '@/app/pages/groups/_context/ChatContext'
import GroupsPage from '@/app/pages/groups/page'

// Wrap your app with ChatProvider
<ChatProvider>
  <GroupsPage />
</ChatProvider>
```

### For External Use
1. Copy the entire `groups` folder
2. Rewire auth/zone dependencies to your own stores or hooks
3. Ensure Firebase is configured
4. Install required dependencies

## Features

- Real-time messaging
- Group chat creation and management
- Direct messaging
- Friend requests
- File sharing
- Online status
- Message read receipts
- Zone-based isolation

## Firebase Requirements

### Collections Used
- `chats` - Chat metadata
- `messages` - Chat messages
- `users` - User profiles for chat
- `friend_requests` - Friend request management

### Security Rules
Ensure proper Firestore security rules are in place for zone-based data isolation.