# Calendar Module

A comprehensive calendar system for managing rehearsals, performances, meetings, and other zone events using React Big Calendar.

## Features

### 📅 **Calendar Views**
- **Month View** - Overview of all events in a month
- **Week View** - Detailed weekly schedule
- **Day View** - Hourly breakdown of a single day
- **Agenda View** - List format of upcoming events

### 🎯 **Event Management**
- **Create Events** - Add new events with detailed information
- **Edit Events** - Modify existing event details
- **Delete Events** - Remove events with confirmation
- **Event Types** - Categorize events (Rehearsal, Performance, Meeting, Other)
- **Color Coding** - Visual distinction by event type or custom colors

### 🔄 **Recurring Events**
- **Daily Recurrence** - Events that repeat daily
- **Weekly Recurrence** - Events that repeat weekly
- **Monthly Recurrence** - Events that repeat monthly
- **Custom Intervals** - Set custom repeat intervals
- **End Dates** - Define when recurring events should stop

### 🔔 **Reminders & Notifications**
- **Email Reminders** - Send email notifications before events
- **Push Notifications** - Browser/app notifications
- **Custom Timing** - Set reminder timing (minutes before event)
- **Multiple Reminders** - Add multiple reminders per event

### 👥 **Attendee Management**
- **Add Attendees** - Invite zone members to events
- **RSVP Tracking** - Track attendance responses
- **Attendee Status** - Pending, Accepted, Declined statuses

### 🎨 **Zone Integration**
- **Theme Colors** - Uses zone-specific colors
- **Zone Isolation** - Events are zone-specific
- **Permission System** - Role-based event management

## File Structure

```
src/app/pages/calendar/
├── page.tsx                    # Main calendar page
├── calendar.css               # Custom calendar styles
├── README.md                  # This documentation
├── _lib/
│   ├── index.ts              # Library exports
│   └── calendar-service.ts  # Firebase service
└── _components/
    ├── index.ts              # Component exports
    ├── CalendarToolbar.tsx   # Custom calendar toolbar
    ├── EventModal.tsx        # Create/edit event modal
    └── EventDetailsModal.tsx # View event details modal
```

## Components

### CalendarPage
Main calendar component that:
- Renders React Big Calendar with custom styling
- Handles event creation, editing, and deletion
- Manages calendar views and navigation
- Integrates with zone theming

### EventModal
Modal for creating and editing events:
- Form validation and submission
- Recurring event configuration
- Reminder setup
- Color and type selection

### EventDetailsModal
Modal for viewing event details:
- Complete event information display
- Edit and delete actions
- Attendee management
- Recurring event information

### CalendarToolbar
Custom toolbar component:
- Navigation controls (Previous, Next, Today)
- View switcher (Month, Week, Day, Agenda)
- Zone-themed styling

## Firebase Service

### CalendarService
Handles all Firebase operations:
- **CRUD Operations** - Create, read, update, delete events
- **Real-time Updates** - Live event synchronization
- **Zone Filtering** - Events filtered by zone
- **Attendee Management** - Manage event attendees
- **Recurring Events** - Generate recurring event instances

### Data Structure

#### CalendarEvent
```typescript
interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  allDay: boolean
  color?: string
  location?: string
  attendees?: string[]
  createdBy: string
  createdByName: string
  zoneId: string
  type: 'rehearsal' | 'performance' | 'meeting' | 'other'
  isRecurring?: boolean
  recurringPattern?: RecurringPattern
  reminders?: Reminder[]
  createdAt: Date
  updatedAt: Date
}
```

## Usage Examples

### Creating an Event
```typescript
const calendarService = new CalendarService()

const eventData = {
  title: 'Weekly Rehearsal',
  description: 'Practice for upcoming performance',
  start: new Date('2024-01-15T19:00:00'),
  end: new Date('2024-01-15T21:00:00'),
  type: 'rehearsal',
  location: 'Main Hall',
  zoneId: 'zone123',
  createdBy: 'user456',
  createdByName: 'John Doe',
  isRecurring: true,
  recurringPattern: {
    frequency: 'weekly',
    interval: 1,
    endDate: new Date('2024-12-31')
  }
}

const eventId = await calendarService.createEvent(eventData)
```

### Subscribing to Events
```typescript
const unsubscribe = calendarService.subscribeToZoneEvents(
  zoneId,
  (events) => {
    setEvents(events)
  }
)

// Cleanup
return unsubscribe
```

## Styling

### Custom CSS
- Overrides React Big Calendar default styles
- Zone-themed colors and branding
- Mobile-responsive design
- Print-friendly styles

### Event Colors
- **Rehearsal** - Green (#10b981)
- **Performance** - Amber (#f59e0b)
- **Meeting** - Blue (#3b82f6)
- **Other** - Purple (#8b5cf6)

## Mobile Responsiveness

- **Touch-friendly** - Large touch targets
- **Responsive views** - Adapts to screen size
- **Mobile navigation** - Optimized for mobile use
- **Gesture support** - Swipe navigation

## Accessibility

- **Keyboard navigation** - Full keyboard support
- **Screen reader friendly** - Proper ARIA labels
- **High contrast** - Accessible color combinations
- **Focus management** - Clear focus indicators

## Performance

- **Lazy loading** - Components loaded on demand
- **Efficient queries** - Optimized Firebase queries
- **Caching** - Event data caching
- **Virtual scrolling** - Handles large event lists

## Security

- **Zone isolation** - Events are zone-specific
- **User permissions** - Role-based access control
- **Data validation** - Input sanitization
- **Secure Firebase rules** - Server-side validation

## Future Enhancements

- **Drag & Drop** - Move events by dragging
- **Export/Import** - Calendar data export
- **Integration** - External calendar sync
- **Advanced Recurring** - Complex recurring patterns
- **Conflict Detection** - Overlapping event warnings
- **Resource Booking** - Room/equipment booking
- **Attendance Tracking** - Check-in/check-out system