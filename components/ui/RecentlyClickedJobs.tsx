import React from 'react';
import styles from './recentlyClickedJobs.module.css';

// Interface aligned with the Job type in pages/jobs.tsx
interface Job {
  UNIQUE_ID: string;
  Title: string; // Was JOB_TITLE
  Company: string; // Was COMPANY
  URL: string; // Was JOB_URL
  date: string; // Was DATE_ADDED, used for displaying date
  created_at?: string; // For isJobNew compatibility
  inserted_at?: string; // For isJobNew compatibility
  Location?: string;
  Summary?: string;
  rate?: string;
  // Add any other job properties you expect to display from jobs.tsx Job type
}

interface RecentlyClickedJobsProps {
  jobs: Job[];
  isLoading: boolean;
  onJobClick: (job: Job) => void; // Expects a Job object
  isJobNew: (job: Job) => boolean;   // Expects a Job object
}

const RecentlyClickedJobs: React.FC<RecentlyClickedJobsProps> = ({ jobs, isLoading, onJobClick, isJobNew }) => {
  if (isLoading) {
    return <div className={styles.loading}>Loading recently clicked jobs...</div>;
  }

  if (jobs.length === 0) {
    return <div className={styles.noJobs}>No jobs clicked in the last 10 days.</div>;
  }

  return (
    <div className={styles.recentlyClickedContainer}>
      <h3 className={styles.header}>Recently Clicked Jobs</h3>
      <ul className={styles.jobList}>
        {jobs.map((job) => (
          <li key={job.UNIQUE_ID} className={`${styles.jobCard} ${isJobNew(job) ? styles.newJob : ''}`} onClick={() => onJobClick(job)}>
            <h4 className={styles.jobTitle}>{job.Title}</h4>
            <p className={styles.company}>{job.Company}</p>
            <p className={styles.date}>Date: {job.date}</p> {/* Displaying job.date */}
            {job.Location && <p className={styles.location}>Location: {job.Location}</p>}
            <a href={job.URL} target="_blank" rel="noopener noreferrer" className={styles.jobLink} onClick={(e) => e.stopPropagation()}>
              View Job
            </a>
            {/* You can add more job details here if needed, e.g., job.Summary */}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecentlyClickedJobs;