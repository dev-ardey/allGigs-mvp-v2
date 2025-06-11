"use client"

import { useEffect, useState, useMemo } from "react"
import { supabase } from "../SupabaseClient"
import LoginForm from "../components/ui/login";
import AddJobForm from "../components/ui/add-job-form";
import Fuse from "fuse.js";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { formatDate } from "../utils/formatDate";
import RecentlyClickedJobs from "../components/ui/RecentlyClickedJobs";


interface Job {
  UNIQUE_ID: string
  Title: string
  Company: string
  Location: string
  rate: string
  date: string
  Summary: string // Fixed: was "stringx"
  URL: string
  created_at?: string // Add optional timestamp field
  inserted_at?: string // Alternative timestamp field name
  added_by?: string // User ID who added the job
  added_by_email?: string // Email of user who added the job
  poster_name?: string // Name of the person who posted the job
  source?: string // Source of the job (e.g., 'allGigs')
  tags?: string // Tags for the job
}

export default function JobBoard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  // Removed searchPills and disregardedPills state variables
  const [user, setUser] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  // Removed selectedIndustry and excludedTerms state variables
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [showAddJobForm, setShowAddJobForm] = useState(false);
  const [userClearance, setUserClearance] = useState<string | null>(null);
  const PAGE_SIZE = 30;
  const [allJobs, setAllJobs] = useState<Job[]>([]);

  // State for Recently Clicked Jobs
  const [showRecentlyClicked, setShowRecentlyClicked] = useState(false);
  const [recentlyClickedJobs, setRecentlyClickedJobs] = useState<Job[]>([]);
  const [loadingRecentlyClicked, setLoadingRecentlyClicked] = useState(false);

  // const paginatedJobs = filteredJobs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const paginationButtonStyle: React.CSSProperties = {
    padding: "10px 16px",
    fontSize: "16px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    backgroundColor: "#fff",
    color: "#000",
    cursor: "pointer",
    minWidth: "44px",
    minHeight: "44px",
    flexShrink: 0
  };
  const menuButtonStyle = {
    background: "#374151",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "10px 16px",
    fontSize: "0.95rem",
    cursor: "pointer",
    width: "80%",
    display: "flex",
    justifySelf: "center",
    justifyContent: "center"

  }

  const logoutButtonStyle = {
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "10px 16px",
    fontSize: "0.95rem",
    cursor: "pointer",
    width: "fit-content",
    // display: "flex",
    // justifySelf: "center",
    // justifyContent: "center"
  }

  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLogo, setShowLogo] = useState(false);



  useEffect(() => {
    const handleScroll = () => {
      setShowLogo(window.scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  // Debounce search term to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);





  // Log search term activity to Supabase
  const logSearchTermActivity = async (searchTermToLog: string) => {

    if (!user || !user.id || !searchTermToLog || searchTermToLog.trim() === "") {
      console.log("[logSearchTermActivity] Pre-condition failed. User:", user, "SearchTerm:", searchTermToLog);
      return;
    }

    console.log("[logSearchTermActivity] Logging search term:", searchTermToLog, "for user:", user.id);
    console.log("[logSearchTermActivity] About to call supabase.from('search_logs').insert()");

    try {
      const insertData = {
        user_id: user.id,
        search_term: searchTermToLog.trim(),
      };
      console.log("[logSearchTermActivity] Insert data:", insertData);

      const { data, error } = await supabase.from("search_logs").insert([insertData]);

      console.log("[logSearchTermActivity] Supabase response - data:", data, "error:", error);

      if (error) {
        console.error("❌ Error logging search term:", error);
        console.error("❌ Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
      } else {
        console.log("✅ Search term logged successfully!");
      }
    } catch (error) {
      console.error("❌ Exception when logging search term:", error);
    }
  };

  // useEffect for logging debounced search term
  useEffect(() => {
    console.log("[useEffect logSearchTerm] Triggered. User:", user, "DebouncedSearchTerm:", debouncedSearchTerm);
    if (user && user.id && debouncedSearchTerm && debouncedSearchTerm.trim() !== "") {
      console.log("[useEffect logSearchTerm] Conditions met. Calling logSearchTermActivity.");
      logSearchTermActivity(debouncedSearchTerm);
    } else {
      console.log("[useEffect logSearchTerm] Conditions NOT met. Skipping logSearchTermActivity.");
      if (!user || !user.id) console.log("[useEffect logSearchTerm] Reason: User or user.id is missing.");
      if (!debouncedSearchTerm || debouncedSearchTerm.trim() === "") console.log("[useEffect logSearchTerm] Reason: debouncedSearchTerm is empty or whitespace.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, user]);

  // Function to check user clearance level
  const checkUserClearance = async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from("user_clearances")
        .select("clearance_level")
        .eq("user_id", userId)
        .single();
      if (error) {
        console.log("No clearance record found for user, checking email domain");
        return null;
      }
      return data?.clearance_level || null;
    } catch (error) {
      console.error("Error checking user clearance:", error);
      return null;
    }
  };

  // Function to check if user has permission to add jobs
  const hasAddJobPermission = (user: any, clearanceLevel: string | null): boolean => {
    if (!user) return false;
    // Allow users with admin or moderator clearance
    if (clearanceLevel === "admin" || clearanceLevel === "moderator") {
      return true;
    }

    // Allow users with specific email domains (backup method)
    const allowedDomains = ["admin.com", "moderator.com", "company.com"];
    const userDomain = user.email?.split("@")[1];

    return allowedDomains.includes(userDomain);
  };

  useEffect(() => {
    // Check auth state on mount
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        checkUserClearance(data.user.id).then(setUserClearance);
      }
    });
    // Listen for login/logout
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setUser(user);
      if (user) {
        checkUserClearance(user.id).then(setUserClearance);
      } else {
        setUserClearance(null);
      }
    });
    return () => { listener?.subscription.unsubscribe(); };
  }, []);

  // Function to refresh jobs list
  const refreshJobs = async () => {
    if (!user) return;
    setLoading(true);
    setPage(0); // Reset to first page
    const { data, error } = await supabase
      .from("Allgigs_All_vacancies_NEW")
      .select("*")
      .range(0, PAGE_SIZE - 1);
    if (error) {
      console.error(error);
    } else {
      setJobs(data || []);
      setHasMore((data?.length || 0) === PAGE_SIZE);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    async function fetchJobs() {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("Allgigs_All_vacancies_NEW")
        .select("*")
        .range(from, to);
      if (error) {
        console.error(error);
      } else {
        setJobs(data || []);
        setHasMore((data?.length || 0) === PAGE_SIZE);
      }
      setLoading(false);
    }
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page]);


  useEffect(() => {
    if (!user) return;
    setLoading(true);
    async function fetchJobs() {
      const { data, error } = await supabase
        .from("Allgigs_All_vacancies_NEW")
        .select("*");

      if (error) {
        console.error(error);
      } else {
        setAllJobs(data || []);
      }
      setLoading(false);
    }
    fetchJobs();
  }, [user]);

  // Function to fetch recently clicked jobs
  const fetchRecentlyClickedJobs = async () => {
    if (!user || !user.id) return;
    setLoadingRecentlyClicked(true);
    try {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const { data: clicks, error: clicksError } = await supabase
        .from('job_clicks')
        .select('job_id, clicked_at')
        .eq('user_id', user.id)
        .gte('clicked_at', tenDaysAgo.toISOString())
        .order('clicked_at', { ascending: false });

      if (clicksError) {
        console.error('Error fetching recent job clicks:', clicksError);
        setRecentlyClickedJobs([]);
        setLoadingRecentlyClicked(false);
        return;
      }

      if (!clicks || clicks.length === 0) {
        setRecentlyClickedJobs([]);
        setLoadingRecentlyClicked(false);
        return;
      }

      const jobIds = clicks.map(click => click.job_id);
      const uniqueJobIds = [...new Set(jobIds)];

      const { data: jobsData, error: jobsError } = await supabase
        .from('Allgigs_All_vacancies_NEW')
        .select('*')
        .in('UNIQUE_ID', uniqueJobIds);

      if (jobsError) {
        console.error('Error fetching recently clicked job details:', jobsError);
        setRecentlyClickedJobs([]);
      } else {
        // To maintain the order of recency from clicks, we can sort jobsData
        // based on the order of uniqueJobIds derived from sorted clicks.
        const orderedJobs = uniqueJobIds.map(id => jobsData?.find(job => job.UNIQUE_ID === id)).filter(job => job !== undefined) as Job[];
        setRecentlyClickedJobs(orderedJobs || []);
      }
    } catch (error) {
      console.error('Error in fetchRecentlyClickedJobs:', error);
      setRecentlyClickedJobs([]);
    } finally {
      setLoadingRecentlyClicked(false);
    }
  };


  // useEffect for fetching recently clicked jobs
  useEffect(() => {
    if (user && showRecentlyClicked) {
      fetchRecentlyClickedJobs();
    }
    // Do not add fetchRecentlyClickedJobs to dependency array if it's stable
    // or wrap it in useCallback if it needs to be in the dependency array.
    // For now, assuming it's stable as it's defined in the component scope.
  }, [user, showRecentlyClicked]);

  // Memoize the Fuse.js instance to avoid recreating it on every render
  const fuse = useMemo(() => new Fuse(allJobs, { // Changed from jobs to allJobs for Fuse
    keys: ["Title", "Company", "Location", "Summary"],
    threshold: 0.4, // Adjust for more/less fuzziness
  }), [allJobs]);

  // Memoize filtered jobs to avoid expensive filtering on every render
  const filteredJobs = useMemo(() => {
    let filtered = allJobs;

    // 1. Filter by debouncedSearchTerm (AND logic for multiple words)
    if (debouncedSearchTerm && debouncedSearchTerm.trim() !== "") {
      const searchWords = debouncedSearchTerm.trim().toLowerCase().split(/\s+/).filter(word => word.length > 0);
      if (searchWords.length > 0) {
        filtered = allJobs.filter(job => {
          const jobText = `${job.Title} ${job.Company} ${job.Location} ${job.Summary}`.toLowerCase();
          return searchWords.every(word => jobText.includes(word));
        });
      }
      // If searchWords is empty (e.g., searchTerm was just spaces), 
      // no filtering by search term happens here, filtered remains allJobs.
    }

    // Removed filtering by selectedIndustry and excludedTerms

    return filtered;
  }, [allJobs, debouncedSearchTerm]); // Removed selectedIndustry, excludedTerms, categorizeJob


  useEffect(() => {
    setPage(0);
  }, [debouncedSearchTerm]); // Removed selectedIndustry, excludedTerms

  const paginatedJobs = useMemo(() => {
    return filteredJobs.slice((page ?? 0) * PAGE_SIZE, ((page ?? 0) + 1) * PAGE_SIZE);
  }, [filteredJobs, page]);

  // Helper function to check if a job is new (within 3 hours)
  const isJobNew = (job: Job): boolean => {
    const timestamp = job.created_at || job.inserted_at;
    if (!timestamp) return false;

    const jobTime = new Date(timestamp);
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - (3 * 60 * 60 * 1000)); // 3 hours in milliseconds

    return jobTime > threeHoursAgo;
  };

  const handleLogout = async () => {
    const confirmed = window.confirm("Weet je zeker dat je wilt uitloggen?");
    if (!confirmed) return;

    await supabase.auth.signOut();
    setUser(null);
  };
  const totalPages = Math.ceil(filteredJobs.length / PAGE_SIZE);

  const getPageNumbers = () => {
    const visiblePages = 10;
    const half = Math.floor(visiblePages / 2);
    let start = Math.max(0, page - half);
    let end = start + visiblePages;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(0, end - visiblePages);
    }

    return Array.from({ length: end - start }, (_, i) => start + i);
  };

  const pageNumbers = getPageNumbers();

  if (!user) {
    return (
      <div>
        <LoginForm />
      </div>
    );
  }

  if (loading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="text-xl font-semibold text-gray-700">Loading amazing jobs...</div>
          <div className="text-gray-500 mt-2">Please wait while we fetch the latest opportunities</div>
        </div>
      </div>
    )

  // Log job click to Supabase
  const logJobClick = async (job: Job) => {
    if (!user || !user.id) {
      console.error("User not available for logging job click. Aborting.");
      return;
    }
    console.log("Logging job click for user:", user.id, "Job ID:", job.UNIQUE_ID, "Job Title:", job.Title);
    try {
      const { error } = await supabase.from("job_clicks").insert([
        {
          user_id: user.id,
          job_id: job.UNIQUE_ID,
          job_title: job.Title,
          company: job.Company,
          location: job.Location,
          rate: job.rate,
          date_posted: job.date,
          summary: job.Summary,
          url: job.URL,
          // Removed search_pills and disregarded_pills
        },
      ]);
      if (error) {
        console.error("Error logging job click:", error);
      } else {
        console.log("Job click logged successfully for job:", job.UNIQUE_ID);
      }
    } catch (error) {
      console.error("Exception when logging job click:", error);
    }
  };

  // Removed logSearchPillsActivity function

  return (

    <>
      {/* Navbar */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        backgroundColor: "#121f36",
        width: "100%"
      }}>
        {/* Sticky container met twee vaste onderdelen */}

        {/* Topbar met burger en titel */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          height: "60px",
          boxSizing: "border-box"
        }}>
          {/* Burger left */}
          <div style={{ width: "44px", display: "flex", justifyContent: "flex-start" }}>
            <button
              onClick={() => setShowMenu(prev => !prev)}
              style={{
                background: "none",
                border: "none",
                color: "white",
                fontSize: "24px",
                cursor: "pointer",
                minWidth: "44px",
                minHeight: "44px"
              }}
              aria-label="Menu"
            >
              ☰
            </button>
          </div>

          {/* Centered title */}

          {showLogo && (
            <img
              src="/images/allGigs-logo-white.svg"
              alt="AllGigs Logo"
              style={{ height: "40px", transition: "opacity 0.3s" }}
            />
          )}
          {/* Right spacer */}
          <div style={{ width: "44px" }}></div>
        </div>

        {/* Burger menu bar (conditionally visible) */}
        {showMenu && (
          <div style={{
            background: "#121f36",
            color: "white",
            padding: "16px 0",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            boxSizing: "border-box",
            overflowX: "hidden",
          }}>
            {/* <div style={{ marginBottom: "12px" }}>
              <button onClick={() => setShowSettings(true)} style={menuButtonStyle}>User Settings</button>
            </div> */}
            <div>
              <button onClick={handleLogout} style={logoutButtonStyle}>Logout</button>
            </div>
          </div>
        )}
      </div>





      <div className="job-board-container">


        {/* Top Right Buttons */}
        {/* <div style={{
        position: "absolute",
        top: 20,
        right: 20,
        display: "flex",
        gap: "10px",
        zIndex: 1000,
      }}> */}
        {/* Upload new Gig Button */}
        {/* <button
          onClick={() => setShowAddJobForm(true)}
          style={{
            background: "#10b981",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Upload new Gig
        </button> */}

        {/* Logout Button */}
        {/* <button
          onClick={handleLogout}
          style={{
            background: "#e53e3e",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Logout
        </button> */}
        {/* </div> */}

        {/* Header */}
        <div className="job-header">
          {/* <h1>AllGigs<span className="allGigs-lightning">ϟ</span></h1> */}
          <img src="/images/allGigs-logo-white.svg" alt="AllGigs Logo" style={{ height: "70px" }} />

          <p>
            Discover your next opportunity from <span style={{ fontWeight: 600, color: "#0ccf83" }}>{filteredJobs.length}</span> curated positions
          </p>
        </div>



        {/* Removed Industry Groups/Selection UI completely */}

        {/* Filters */}
        <div className="job-filters">
          <input
            placeholder="Search jobs..." // Simplified placeholder
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            // Removed onKeyDown handler for pills, search is now based on debouncedSearchTerm
            style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "1rem" }}
          />
          {/* Removed Search Instructions for pills as pills are removed */}
        </div>
        {debouncedSearchTerm && debouncedSearchTerm.trim() !== "" && (
          <div style={{ marginTop: "0.5rem", marginBottom: "1rem", textAlign: "left", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.9rem", color: "#555", marginRight: "0.25rem" }}>Active search:</span>
            {debouncedSearchTerm.trim().toLowerCase().split(/\s+/).filter(word => word.length > 0).map((word, index) => (
              <span
                key={index}
                style={{
                  backgroundColor: "#0ccf83", // Green background for the pill
                  color: "white",             // White text for contrast
                  padding: "0.25rem 0.75rem",
                  borderRadius: "1rem",       // Rounded corners for pill shape
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  display: "inline-block"
                }}
              >
                {word}
              </span>
            ))}
          </div>
        )}

        {/* Add Job Button - Only show for users with proper clearance */}
        {user && hasAddJobPermission(user, userClearance) && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "1rem"
          }}>
            <button
              onClick={() => setShowAddJobForm(true)}
              style={{
                padding: "12px 24px",
                borderRadius: "8px",
                background: "#10b981",
                color: "#fff",
                fontWeight: "600",
                border: "none",
                fontSize: "1rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
              }}
            >
              <span style={{ fontSize: "1.2rem" }}>+</span>
              Add New Job
            </button>
          </div>
        )}

        {/* {hasMore && (
        <button
          onClick={() => setPage(page + 1)}
          style={{
            margin: "2rem auto",
            display: "block",
            padding: "12px 32px",
            borderRadius: "8px",
            background: "#4f46e5",
            color: "#fff",
            fontWeight: "bold",
            border: "none",
            fontSize: "1.1rem",
            cursor: "pointer",
          }}
        >
          Load More
        </button>
      )} */}


        {/* Recently Clicked Jobs Section */}
        <div style={{ marginBottom: "2rem", marginTop: "-1rem", padding: "1rem 0", display: "flex", justifyContent: "center", flexDirection: "column" }}>
          <button
            onClick={() => {
              const newShowState = !showRecentlyClicked;
              setShowRecentlyClicked(newShowState);
              if (newShowState && recentlyClickedJobs.length === 0) { // Fetch only if opening and no jobs loaded
                // fetchRecentlyClickedJobs(); // fetch is now handled by useEffect
              }
            }}
            style={{
              ...menuButtonStyle,
              width: "auto",
              marginBottom: "1rem",
              background: showRecentlyClicked ? "#b2b2b2" : "#0ccf83", // Adjusted color
              padding: "12px 20px",
              fontSize: "1rem",
              borderRadius: "16px",
              color: "black",
              marginLeft: "auto",
              marginRight: "auto"
            }}
          >
            {showRecentlyClicked ? "Hide" : "Show"} Recently Clicked Jobs
          </button>

          {showRecentlyClicked && (
            <RecentlyClickedJobs
              jobs={recentlyClickedJobs}
              isLoading={loadingRecentlyClicked}
              onJobClick={logJobClick}
              isJobNew={isJobNew}
            />
          )}
        </div>


        {/* Job List */}
        <div className="job-list">
          {paginatedJobs.map((job) => (
            <div className="job-card" key={job.UNIQUE_ID}>
              <div className="job-main">
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <h3 style={{ margin: 0 }}>{job.Title}</h3>
                  {isJobNew(job) && (
                    <span
                      style={{
                        backgroundColor: "#10b981",
                        color: "white",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      New
                    </span>
                  )}
                  {(job.source === 'allGigs' || job.tags?.includes('allGigs')) && (
                    <span
                      style={{
                        backgroundColor: "#4f46e5",
                        color: "white",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      allGigs
                    </span>
                  )}
                </div>
                <p><strong></strong>{job.Company}</p>
                <div className="job-pill-container">
                  <p className="job-pill"><strong></strong> {job.rate}</p>
                  <p className="job-pill"><strong></strong>{formatDate(job.date)}</p>
                  <p className="job-pill"><strong></strong> {job.Location}</p>

                </div>
                <p ><strong></strong> {job.Summary}</p>
                {/* Show poster information for allGigs jobs */}
                {(job.source === 'allGigs' || job.tags?.includes('allGigs')) && job.added_by_email && (
                  <div style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    padding: "0.75rem",
                    marginTop: "0.75rem"
                  }}>
                    <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
                      Contact Information:
                    </p>
                    <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.875rem" }}>
                      <strong>Name:</strong> {job.poster_name || 'Not provided'}
                    </p>
                    <p style={{ margin: 0, fontSize: "0.875rem" }}>
                      <strong>Email:</strong> {job.added_by_email}
                    </p>
                  </div>
                )}

                {/* View Job button - different behavior for allGigs vs external jobs */}
                {job.URL && (
                  <>
                    {(job.source === 'allGigs' || job.tags?.includes('allGigs')) ? (
                      <button
                        className="view-job-btn"
                        onClick={() => {
                          logJobClick(job);
                          // For allGigs jobs, show contact info (already visible above)
                          alert(`To apply for this job, please contact:\n\nName: ${job.poster_name || 'Not provided'}\nEmail: ${job.added_by_email}\n\nYou can also see the contact information above.`);
                        }}
                        style={{
                          backgroundColor: "#4f46e5",
                          color: "white",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          marginTop: "0.75rem"
                        }}
                      >
                        View Contact Info
                      </button>
                    ) : (
                      <a
                        href={job.URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="view-job-btn"
                        onClick={() => logJobClick(job)}
                      >
                        View Job
                      </a>
                    )}
                  </>
                )}
                {/* <div className="job-id">ID: {job.UNIQUE_ID.slice(-6)}</div> */}
              </div>
            </div>
          ))}
        </div>

        {/* Add Job Form Modal */}
        {showAddJobForm && user && (
          <AddJobForm
            onClose={() => setShowAddJobForm(false)}
            onJobAdded={refreshJobs}
            user={user}
          />
        )}

        {/* Pagination */}
        {filteredJobs.length > 0 && (
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "8px",
            padding: "1rem",
            marginTop: "2rem",
          }}>
            {/* Only show First and Prev if not on first page */}
            {page > 0 && (
              <>
                <button onClick={() => setPage(0)} style={paginationButtonStyle}>« First</button>
                <button onClick={() => setPage(prev => Math.max(prev - 1, 0))} style={paginationButtonStyle}>← Prev</button>
              </>
            )}

            {/* Page numbers */}
            {pageNumbers.map(num => (
              <button
                key={num}
                onClick={() => setPage(num)}
                style={{
                  ...paginationButtonStyle,
                  backgroundColor: num === page ? "#0ccf83" : "#fff",
                  color: num === page ? "#fff" : "#000",
                  fontWeight: num === page ? "bold" : "normal",
                }}
              >
                {num + 1}
              </button>
            ))}

            {/* Only show Next and Last if not on last page */}
            {page < totalPages - 1 && (
              <>
                <button onClick={() => setPage(prev => Math.min(prev + 1, totalPages - 1))} style={paginationButtonStyle}>→ Next</button>
                <button onClick={() => setPage(totalPages - 1)} style={paginationButtonStyle}>» Last</button>
              </>
            )}
          </div>


        )}


      </div>
    </>
  )
}

