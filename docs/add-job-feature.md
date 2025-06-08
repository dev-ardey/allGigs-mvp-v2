# Add Job Feature Documentation

## Overview
The Add Job feature allows authorized users to add new job postings directly to the job board. This feature includes a clearance-based permission system to control who can add jobs.

## Features
- **Clearance-based Access Control**: Only users with proper clearance levels can add jobs
- **User-friendly Form**: Clean, modal-based form for job submission
- **Real-time Updates**: Job list refreshes automatically after adding a new job
- **Audit Trail**: All job additions are logged with user information
- **Validation**: Form validation ensures required fields are completed

## Permission System

### Clearance Levels
- **admin**: Full access to add jobs and manage other users' clearances
- **moderator**: Can add jobs but cannot manage clearances
- **user**: Standard user with no special permissions

### Fallback Permission Check
If no clearance record exists, the system checks email domains:
- Users with emails from `admin.com`, `moderator.com`, or `company.com` domains are granted access
- This provides a backup method for permission checking

## Database Tables

### user_clearances
Stores user permission levels:
- `user_id`: References auth.users(id)
- `clearance_level`: 'admin', 'moderator', or 'user'
- `granted_by`: User who granted the clearance
- `granted_at`: Timestamp of when clearance was granted
- `notes`: Optional notes about the clearance

### job_additions
Logs all job additions for audit purposes:
- `user_id`: User who added the job
- `job_id`: Unique identifier of the added job
- `job_title`: Title of the job that was added
- `company`: Company name
- `added_at`: Timestamp of job addition

## Setup Instructions

1. **Database Setup**: Run the SQL script in `database/setup.sql` in your Supabase SQL editor

2. **Grant User Clearances**: Add clearance records for authorized users:
   ```sql
   INSERT INTO user_clearances (user_id, clearance_level, notes) VALUES
   ('user-uuid-here', 'admin', 'System administrator');
   ```

3. **Configure Email Domains** (Optional): Update the `allowedDomains` array in `jobs.tsx` to include your organization's email domains

## Usage

### For Authorized Users
1. Log into the job board
2. If you have proper clearance, you'll see a green "Add New Job" button
3. Click the button to open the job submission form
4. Fill out all required fields:
   - Job Title (required)
   - Company (required)
   - Location (required)
   - Rate/Salary (required)
   - Job Description/Summary (required)
   - Job URL (optional)
5. Click "Add Job" to submit

### For Administrators
- Admins can grant clearances to other users through direct database access
- All job additions are logged in the `job_additions` table for auditing

## Technical Implementation

### Key Components
- `AddJobForm`: Modal component for job submission
- `checkUserClearance()`: Function to verify user permissions
- `hasAddJobPermission()`: Function to determine if user can add jobs
- `refreshJobs()`: Function to reload job list after additions

### Performance Considerations
- Form submission is debounced to prevent duplicate submissions
- Job list refresh is optimized to only fetch necessary data
- Modal is conditionally rendered to avoid unnecessary DOM elements

### Security Features
- Row Level Security (RLS) policies protect sensitive data
- User permissions are checked both client-side and server-side
- All job additions are logged with user identification
- Form validation prevents incomplete submissions

## Troubleshooting

### Common Issues
1. **Add Job button not showing**: Check user clearance level and email domain
2. **Permission denied errors**: Verify RLS policies are properly configured
3. **Form submission fails**: Check Supabase connection and table permissions

### Debugging
- Check browser console for error messages
- Verify user authentication status
- Confirm database table structure matches expected schema
- Test clearance checking function in browser developer tools
