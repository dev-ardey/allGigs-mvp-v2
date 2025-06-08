import { useState } from "react";
import { supabase } from "../../SupabaseClient";

interface AddJobFormProps {
  onClose: () => void;
  onJobAdded: () => void;
  user: any;
}

export default function AddJobForm({ onClose, onJobAdded, user }: AddJobFormProps) {
  // Ensure user is logged in
  if (!user) {
    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "12px",
          padding: "2rem",
          width: "90%",
          maxWidth: "400px",
          textAlign: "center",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
        }}>
          <h2 style={{ color: "#dc2626", marginBottom: "1rem" }}>Login Required</h2>
          <p style={{ marginBottom: "1.5rem", color: "#374151" }}>
            You must be logged in with an activated account to post new gigs.
          </p>
          <button
            onClick={onClose}
            style={{
              padding: "0.75rem 1.5rem",
              border: "none",
              borderRadius: "6px",
              backgroundColor: "#4f46e5",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const [formData, setFormData] = useState({
    title: "",
    company: "",
    location: "",
    rate: "",
    summary: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Generate a unique ID for the job
      const uniqueId = `JOB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Get current date
      const currentDate = new Date().toISOString().split('T')[0];

      // Create the job URL automatically (pointing to allGigs contact page)
      const jobUrl = `https://allgigs.com/contact?job=${uniqueId}&poster=${user.email}`;

      const jobData = {
        UNIQUE_ID: uniqueId,
        Title: formData.title,
        Company: formData.company,
        Location: formData.location,
        rate: formData.rate,
        Summary: formData.summary,
        URL: jobUrl,
        date: currentDate,
        created_at: new Date().toISOString(),
        inserted_at: new Date().toISOString(),
        added_by: user.id,
        added_by_email: user.email,
        poster_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
        source: 'allGigs',
        tags: 'allGigs'
      };

      // Insert the job into the main table
      const { error: insertError } = await supabase
        .from("Allgigs_All_vacancies_NEW")
        .insert([jobData]);

      if (insertError) {
        throw insertError;
      }

      // Log the job posting activity (similar to search logging)
      try {
        await supabase.from("job_postings_log").insert([
          {
            user_id: user.id,
            user_email: user.email,
            job_id: uniqueId,
            job_title: formData.title,
            company: formData.company,
            location: formData.location,
            rate: formData.rate,
            posted_at: new Date().toISOString(),
            user_agent: navigator.userAgent,
            ip_address: null // Will be handled server-side if needed
          }
        ]);
      } catch (logError) {
        console.error("Error logging job posting:", logError);
        // Don't fail the job posting if logging fails
      }

      // Optional: Also log in the existing job_additions table for backward compatibility
      try {
        await supabase.from("job_additions").insert([
          {
            user_id: user.id,
            job_id: uniqueId,
            job_title: formData.title,
            company: formData.company,
            added_at: new Date().toISOString()
          }
        ]);
      } catch (legacyLogError) {
        console.error("Error in legacy job additions log:", legacyLogError);
        // Don't fail the job posting if legacy logging fails
      }

      // Success - close form and refresh job list
      onJobAdded();
      onClose();
      
      // Show success message (optional)
      console.log("Job posted successfully:", uniqueId);
      
    } catch (err: any) {
      setError(err.message || "Failed to add job. Please try again.");
      console.error("Error posting job:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "12px",
        padding: "2rem",
        width: "90%",
        maxWidth: "600px",
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem"
        }}>
          <h2 style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            margin: 0,
            color: "#374151"
          }}>
            Add New Job
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#6b7280",
              padding: "0.25rem"
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: "#fee2e2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            padding: "0.75rem",
            borderRadius: "6px",
            marginBottom: "1rem",
            fontSize: "0.875rem"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "0.25rem"
            }}>
              Job Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              minLength={3}
              maxLength={200}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "0.875rem",
                outline: "none"
              }}
              placeholder="e.g., Senior React Developer"
            />
          </div>

          <div>
            <label style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "0.25rem"
            }}>
              Company *
            </label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              required
              minLength={2}
              maxLength={100}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "0.875rem",
                outline: "none"
              }}
              placeholder="e.g., Tech Corp Inc."
            />
          </div>

          <div>
            <label style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "0.25rem"
            }}>
              Location *
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              minLength={2}
              maxLength={100}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "0.875rem",
                outline: "none"
              }}
              placeholder="e.g., Remote, New York, NY, London, UK"
            />
          </div>

          <div>
            <label style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "0.25rem"
            }}>
              Rate/Salary *
            </label>
            <input
              type="text"
              name="rate"
              value={formData.rate}
              onChange={handleChange}
              required
              minLength={1}
              maxLength={50}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "0.875rem",
                outline: "none"
              }}
              placeholder="e.g., $80,000/year, $50/hour, £40/hour, Negotiable"
            />
          </div>

          <div>
            <label style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "0.25rem"
            }}>
              Job Description/Summary *
            </label>
            <textarea
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              required
              minLength={50}
              maxLength={2000}
              rows={6}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "0.875rem",
                outline: "none",
                resize: "vertical",
                minHeight: "120px"
              }}
              placeholder="Detailed job description, requirements, responsibilities, skills needed, etc. (minimum 50 characters)"
            />
            <div style={{
              fontSize: "0.75rem",
              color: "#6b7280",
              marginTop: "0.25rem"
            }}>
              {formData.summary.length}/2000 characters (minimum 50 required)
            </div>
          </div>

          <div style={{
            display: "flex",
            gap: "0.75rem",
            marginTop: "1rem"
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                backgroundColor: "#fff",
                color: "#374151",
                fontSize: "0.875rem",
                fontWeight: "500",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                border: "none",
                borderRadius: "6px",
                backgroundColor: isSubmitting ? "#9ca3af" : "#4f46e5",
                color: "#fff",
                fontSize: "0.875rem",
                fontWeight: "500",
                cursor: isSubmitting ? "not-allowed" : "pointer"
              }}
            >
              {isSubmitting ? "Adding Job..." : "Add Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
