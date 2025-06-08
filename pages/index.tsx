"use client"

import { useEffect, useState, useMemo } from "react"
import { supabase } from "../SupabaseClient"
import LoginForm from "../components/ui/login";
import AddJobForm from "../components/ui/add-job-form";
import Fuse from "fuse.js";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { formatDate } from "../utils/formatDate";



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
  const [searchPills, setSearchPills] = useState<string[]>([]);
  const [disregardedPills, setDisregardedPills] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [excludedTerms, setExcludedTerms] = useState<string[]>([]);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [showAddJobForm, setShowAddJobForm] = useState(false);
  const [userClearance, setUserClearance] = useState<string | null>(null);
  const PAGE_SIZE = 30;
  const [allJobs, setAllJobs] = useState<Job[]>([]);
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
    width: "80%",
    display: "flex",
    justifySelf: "center",
    justifyContent: "center"
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







  // Helper function to categorize jobs by industry based on title and summary
  const categorizeJob = (job: Job): string => {
    const text = `${job.Title} ${job.Summary}`.toLowerCase();

    // Helper function to check if a keyword exists with word boundaries
    const hasKeywordWithBoundary = (text: string, keyword: string): boolean => {
      // Normalize text by replacing underscores and other separators with spaces
      const normalizedText = text.replace(/[_\-]/g, ' ').toLowerCase();
      const normalizedKeyword = keyword.toLowerCase();
      // For single words that need boundaries, use word boundary regex
      if (keyword.length <= 3 || ['hr', 'bi', 'ai', 'seo', 'sem', 'crm'].includes(keyword)) {
        const regex = new RegExp(`\\b${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(normalizedText);
      }
      // For longer phrases, use simple includes on normalized text
      return normalizedText.includes(normalizedKeyword);
    };
    // Define industry keywords with priority scoring
    const industries = {
      "Design": {
        keywords: ["graphic design", "visual design", "brand design", "logo design", "illustration", "figma", "photoshop", "illustrator", "sketch", "adobe creative", "branding", "print design", "ui designer", "ux designer", "ui/ux", "user interface", "user experience", "wireframe", "prototype", "usability", "interaction design", "product design", "design system", "packaging design", "packaging designer", "designer"],
        score: 0
      },
      "Development": {
        keywords: ["developer", "development", "programming", "code", "software", "frontend", "backend", "fullstack", "javascript", "react", "angular", "vue", "node.js", "php", "ruby", "java", "c#", "c++", "swift", "kotlin", "flutter", "react native", "web development", "mobile development"],
        score: 0
      },
      "Data": {
        keywords: ["data analyst", "data scientist", "machine learning", "ai", "artificial intelligence", "sql", "database", "tableau", "power bi", "excel analytics", "statistics", "modeling", "visualization", "big data", "bi", "business intelligence"],
        score: 0
      },
      "Python": {
        keywords: ["python", "django", "flask", "pandas", "numpy", "tensorflow", "pytorch", "jupyter", "scikit-learn"],
        score: 0
      },
      "Marketing": {
        keywords: ["marketing", "seo", "sem", "social media marketing", "content marketing", "email marketing", "digital marketing", "growth marketing", "advertising", "campaign management"],
        score: 0
      },
      "Writing": {
        keywords: ["content writer", "copywriter", "blog writing", "article writing", "technical writing", "documentation", "journalism", "editing", "proofreading"],
        score: 0
      },
      "Sales": {
        keywords: ["sales", "business development", "account management", "customer success", "lead generation", "crm", "revenue", "sales representative"],
        score: 0
      },
      "Project Management": {
        keywords: ["project manager", "scrum master", "agile", "product manager", "coordinator", "planning", "roadmap", "stakeholder management"],
        score: 0
      },
      "Finance": {
        keywords: ["finance", "accounting", "bookkeeping", "financial analyst", "budget", "tax", "payroll", "quickbooks", "financial planning"],
        score: 0
      },
      "Legal": {
        keywords: ["legal", "lawyer", "attorney", "paralegal", "contract", "compliance", "law", "litigation"],
        score: 0
      },
      "Operations": {
        keywords: ["operations", "logistics", "supply chain", "process improvement", "optimization", "efficiency", "workflow"],
        score: 0
      },
      "HR": {
        keywords: ["human resources", "hr", "recruiting", "talent acquisition", "hiring", "onboarding", "employee relations", "benefits"],
        score: 0
      },
      "Coaching": {
        keywords: ["coach", "coaching", "life coach", "career coach", "executive coach", "business coach", "performance coach", "leadership coach", "mentor", "mentoring"],
        score: 0
      },
      "Consulting": {
        keywords: ["consultant", "consulting", "advisory", "strategy", "business analyst", "transformation", "management consultant", "strategy consultant"],
        score: 0
      },
      "Translation": {
        keywords: ["translation", "translator", "language", "localization", "multilingual", "interpreter"],
        score: 0
      },
      "Video & Audio": {
        keywords: ["video editing", "audio editing", "video production", "youtube", "podcast", "sound design", "voice over", "animation", "motion graphics"],
        score: 0
      },
      "Customer Support": {
        keywords: ["customer support", "customer service", "help desk", "technical support", "chat support", "call center"],
        score: 0
      }
    };
    // Score each industry based on keyword matches
    for (const [industry, data] of Object.entries(industries)) {
      data.score = data.keywords.filter(keyword => hasKeywordWithBoundary(text, keyword)).length;
    }
    // Find the industry with the highest score
    const bestMatch = Object.entries(industries)
      .filter(([, data]) => data.score > 0)
      .sort(([, a], [, b]) => b.score - a.score)[0];

    const result = bestMatch ? bestMatch[0] : "Other";

    return result;
  };

  // Calculate industry groups with job counts - MOVED TO TOP LEVEL
  const getIndustryGroups = useMemo(() => {
    const industryCount: { [key: string]: number } = {};
    jobs.forEach(job => {
      const industry = categorizeJob(job);
      industryCount[industry] = (industryCount[industry] || 0) + 1;
    });
    // Filter industries with more than 1 job
    return Object.entries(industryCount)
      .filter(([industry, count]) => count > 1)
      .sort(([, a], [, b]) => b - a) // Sort by count descending
      .map(([industry, count]) => ({ industry, count }));
  }, [jobs]);

  // Memoize the Fuse.js instance to avoid recreating it on every render - MOVED TO TOP LEVEL
  const fuse = useMemo(() => new Fuse(jobs, {
    keys: ["Title", "Company", "Location", "Summary"],
    threshold: 0.4, // Adjust for more/less fuzziness
  }), [jobs]);

  // Memoize filtered jobs to avoid expensive filtering on every render - MOVED TO TOP LEVEL
  const filteredJobs = useMemo(() => {
    let filtered = allJobs;

    // First, apply industry filtering if we have industry pills
    const industryPills = searchPills.filter(pill => {
      return getIndustryGroups.some(({ industry }) => industry.toLowerCase() === pill);
    });

    const nonIndustryPills = searchPills.filter(pill => {
      return !getIndustryGroups.some(({ industry }) => industry.toLowerCase() === pill);
    });

    // Apply industry category filtering
    if (industryPills.length > 0) {
      filtered = filtered.filter((job) => {
        const jobIndustry = categorizeJob(job);
        const isMatch = industryPills.some(pill => jobIndustry.toLowerCase() === pill);
        return isMatch;
      });
    }

    // Apply search pills filtering (for non-industry terms)
    if (nonIndustryPills.length > 0) {
      const searchString = nonIndustryPills.join(" ");

      // For short, specific terms (like "food"), use exact matching
      // For longer or multiple terms, use fuzzy search
      const shouldUseExactMatch = nonIndustryPills.some(pill =>
        pill.length <= 6 && !pill.includes(" ")
      );

      if (shouldUseExactMatch) {
        // Use exact string matching for precise terms
        filtered = filtered.filter((job) => {
          const text = `${job.Title} ${job.Company} ${job.Location} ${job.Summary}`.toLowerCase();
          const matches = nonIndustryPills.every(pill => text.includes(pill.toLowerCase()));
          return matches;
        });
      } else {
        // Use fuzzy search for longer or compound terms
        const fuseFiltered = new Fuse(filtered, {
          keys: ["Title", "Company", "Location", "Summary"],
          threshold: 0.2, // More strict fuzzy matching
        });
        filtered = fuseFiltered.search(searchString).map(result => result.item);
      }
    }

    // Apply industry-specific term exclusion filtering
    if (selectedIndustry && excludedTerms.length > 0) {
      filtered = filtered.filter((job) => {
        const jobIndustry = categorizeJob(job);
        // Only apply exclusion if the job belongs to the selected industry
        if (jobIndustry.toLowerCase() === selectedIndustry.toLowerCase()) {
          const text = `${job.Title} ${job.Summary}`.toLowerCase();
          // Check if any excluded terms are present in the job
          return !excludedTerms.some(term => {
            // Use the same boundary logic as in categorization
            const hasKeywordWithBoundary = (text: string, keyword: string): boolean => {
              if (keyword.length <= 3 || ['hr', 'bi', 'ai', 'seo', 'sem', 'crm'].includes(keyword)) {
                const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                return regex.test(text);
              }
              return text.includes(keyword);
            };
            return hasKeywordWithBoundary(text, term);
          });
        }
        return true; // Keep jobs from other industries
      });
    }

    // Apply disregarded pills filtering (exclude jobs that match these terms)
    if (disregardedPills.length > 0) {
      filtered = filtered.filter((job) => {
        const text = `${job.Title} ${job.Company} ${job.Summary}`.toLowerCase();
        // Exclude job if any disregarded term is found
        return !disregardedPills.some(term => {
          const hasKeywordWithBoundary = (text: string, keyword: string): boolean => {
            if (keyword.length <= 3 || ['hr', 'bi', 'ai', 'seo', 'sem', 'crm'].includes(keyword)) {
              const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
              return regex.test(text);
            }
            return text.includes(keyword);
          };
          return hasKeywordWithBoundary(text, term);
        });
      });
    }

    return filtered;
  }, [allJobs, searchPills, selectedIndustry, excludedTerms, disregardedPills, getIndustryGroups]);


  useEffect(() => {
    setPage(0);
  }, [searchPills, selectedIndustry, excludedTerms, disregardedPills]);

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
    await supabase.from("job_clicks").insert([
      {
        user_id: user?.id,
        job_id: job.UNIQUE_ID,
        job_title: job.Title,
        company: job.Company,
        location: job.Location,
        rate: job.rate,
        date_posted: job.date, // Assuming 'date' in Job interface corresponds to 'date_posted' in your table
        summary: job.Summary,
        url: job.URL,
        search_pills: searchPills.length ? searchPills : null, // logs as array
        disregarded_pills: disregardedPills.length ? disregardedPills : null, // logs as array
        // or: search_pills: searchPills.join(", "), // logs as string
      },
    ]);
  };

  // Log search pills activity to Supabase
  const logSearchPillsActivity = async (currentPills: string[], currentDisregardedPills?: string[]) => {
    if (!user || !user.id) return; // Ensure user is available

    try {
      const { error } = await supabase.from("search_logs").insert([
        {
          user_id: user.id,
          search_pills: currentPills.length > 0 ? currentPills : null,
          disregarded_pills: currentDisregardedPills && currentDisregardedPills.length > 0 ? currentDisregardedPills : null,
          // timestamp will be added by Supabase by default if the column is timestamptz and has a default value of now()
        },
      ]);
      if (error) {
        console.error("Error logging search pills:", error);
      }
    } catch (error) {
      console.error("Exception when logging search pills:", error);
    }
  };

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



        {/* Industry Groups / feature voor later tijdelijk uit, terug? verwiijder: false && */}
        {false && (() => {
          return getIndustryGroups.length > 0 && (
            <div style={{
              marginBottom: "2rem",
              background: "#fff",
              borderRadius: "16px",
              padding: "1.5rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              border: "1px solid #e5e7eb"
            }}>

              <div className="industry-header">

                <h3 className="industry-title"
                  style={{
                    margin: "0 0 1rem 0",
                    fontSize: "1.25rem",
                    fontWeight: "600",
                    color: "#374151"
                  }}>
                  Browse by Industry
                </h3>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem"
                }}>
                  <select className="industry-select"
                    onChange={(e) => {
                      if (e.target.value) {
                        const industryPill = e.target.value.toLowerCase();
                        if (!searchPills.includes(industryPill)) {
                          const newPills = [...searchPills, industryPill];
                          setSearchPills(newPills);
                          logSearchPillsActivity(newPills, disregardedPills);
                        }
                        // Set selected industry for term exclusion
                        setSelectedIndustry(e.target.value);
                        // Reset excluded terms when changing industry
                        setExcludedTerms([]);
                        // Reset dropdown to placeholder
                        e.target.value = "";
                      }
                    }}
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      background: "#fff",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      color: "#475569",
                      cursor: "pointer",
                      outline: "none",
                      minWidth: "200px",
                    }}
                  >
                    <option value="">Select an industry...</option>
                    {getIndustryGroups.map(({ industry, count }) => (
                      <option
                        key={industry}
                        value={industry}
                        disabled={searchPills.includes(industry.toLowerCase())}
                      >
                        {industry} ({count} jobs)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Industry Term Exclusion */}
                {selectedIndustry && (() => {
                  // Get the industry keywords for the selected industry
                  const getIndustryKeywords = (industryName: string): string[] => {
                    const industries = {
                      "Design": ["graphic design", "visual design", "brand design", "logo design", "illustration", "figma", "photoshop", "illustrator", "sketch", "adobe creative", "branding", "print design", "ui designer", "ux designer", "ui/ux", "user interface", "user experience", "wireframe", "prototype", "usability", "interaction design", "product design", "design system"],
                      "Development": ["developer", "development", "programming", "code", "software", "frontend", "backend", "fullstack", "javascript", "react", "angular", "vue", "node.js", "php", "ruby", "java", "c#", "c++", "swift", "kotlin", "flutter", "react native", "web development", "mobile development"],
                      "Data": ["data analyst", "data scientist", "machine learning", "ai", "artificial intelligence", "sql", "database", "tableau", "power bi", "excel analytics", "statistics", "modeling", "visualization", "big data", "bi", "business intelligence"],
                      "Python": ["python", "django", "flask", "pandas", "numpy", "tensorflow", "pytorch", "jupyter", "scikit-learn"],
                      "Marketing": ["marketing", "seo", "sem", "social media marketing", "content marketing", "email marketing", "digital marketing", "growth marketing", "advertising", "campaign management"],
                      "Writing": ["content writer", "copywriter", "blog writing", "article writing", "technical writing", "documentation", "journalism", "editing", "proofreading"],
                      "Sales": ["sales", "business development", "account management", "customer success", "lead generation", "crm", "revenue", "sales representative"],
                      "Project Management": ["project manager", "scrum master", "agile", "product manager", "coordinator", "planning", "roadmap", "stakeholder management"],
                      "Finance": ["finance", "accounting", "bookkeeping", "financial analyst", "budget", "tax", "payroll", "quickbooks", "financial planning"],
                      "Legal": ["legal", "lawyer", "attorney", "paralegal", "contract", "compliance", "law", "litigation"],
                      "Operations": ["operations", "logistics", "supply chain", "process improvement", "optimization", "efficiency", "workflow"],
                      "HR": ["human resources", "hr", "recruiting", "talent acquisition", "hiring", "onboarding", "employee relations", "benefits"],
                      "Coaching": ["coach", "coaching", "life coach", "career coach", "executive coach", "business coach", "performance coach", "leadership coach", "mentor", "mentoring"],
                      "Consulting": ["consultant", "consulting", "advisory", "strategy", "business analyst", "transformation", "management consultant", "strategy consultant"],
                      "Translation": ["translation", "translator", "language", "localization", "multilingual", "interpreter"],
                      "Video & Audio": ["video editing", "audio editing", "video production", "youtube", "podcast", "sound design", "voice over", "animation", "motion graphics"],
                      "Customer Support": ["customer support", "customer service", "help desk", "technical support", "chat support", "call center"]
                    };
                    return industries[industryName as keyof typeof industries] || [];
                  };

                  const keywords = getIndustryKeywords(selectedIndustry);

                  if (keywords.length === 0) return null;

                  return (
                    <div style={{
                      marginTop: "1rem",
                      padding: "1rem",
                      background: "#f8fafc",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "0.75rem"
                      }}>
                        <h4 style={{
                          margin: 0,
                          fontSize: "0.95rem",
                          fontWeight: "600",
                          color: "#374151"
                        }}>
                          Refine "{selectedIndustry}" results - Click to exclude terms:
                        </h4>
                        {excludedTerms.length > 0 && (
                          <button
                            onClick={() => setExcludedTerms([])}
                            style={{
                              background: "#f59e0b",
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              padding: "4px 8px",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                              fontWeight: "500"
                            }}
                          >
                            Clear all ({excludedTerms.length})
                          </button>
                        )}
                      </div>
                      <div style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.5rem"
                      }}>
                        {keywords.map((keyword) => {
                          const isExcluded = excludedTerms.includes(keyword);
                          return (
                            <button
                              key={keyword}
                              onClick={() => {
                                if (isExcluded) {
                                  setExcludedTerms(excludedTerms.filter(term => term !== keyword));
                                } else {
                                  setExcludedTerms([...excludedTerms, keyword]);
                                }
                              }}
                              style={{
                                background: isExcluded ? "#ef4444" : "#e2e8f0",
                                color: isExcluded ? "#fff" : "#475569",
                                border: "none",
                                borderRadius: "8px",
                                padding: "0.375rem 0.75rem",
                                fontSize: "0.75rem",
                                cursor: "pointer",
                                fontWeight: "500",
                                textTransform: "capitalize",
                                transition: "all 0.2s",
                                opacity: isExcluded ? 0.9 : 1
                              }}
                              title={isExcluded ? "Click to include" : "Click to exclude"}
                            >
                              {isExcluded ? "✕ " : ""}{keyword}
                            </button>
                          );
                        })}
                      </div>
                      {excludedTerms.length > 0 && (
                        <div style={{
                          marginTop: "0.75rem",
                          padding: "0.5rem",
                          background: "#fee2e2",
                          borderRadius: "6px",
                          fontSize: "0.8rem",
                          color: "#dc2626"
                        }}>
                          <strong>Excluding:</strong> {excludedTerms.join(", ")}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Show currently selected industries as badges */}
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  flex: 1
                }}>
                  {searchPills
                    .filter(pill => getIndustryGroups.some(({ industry }) => industry.toLowerCase() === pill))
                    .map(pill => {
                      const industry = getIndustryGroups.find(({ industry }) => industry.toLowerCase() === pill);
                      return (
                        <span
                          key={pill}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            background: "#4f46e5",
                            color: "#fff",
                            borderRadius: "8px",
                            padding: "0.375rem 0.75rem",
                            fontSize: "0.75rem",
                            fontWeight: "500",
                          }}
                        >
                          {pill.charAt(0).toUpperCase() + pill.slice(1)}
                          {industry && (
                            <span style={{
                              background: "rgba(255,255,255,0.2)",
                              borderRadius: "4px",
                              padding: "0.125rem 0.25rem",
                              fontSize: "0.625rem",
                            }}>
                              {industry.count}
                            </span>
                          )}
                          <button
                            onClick={() => {
                              const newPills = searchPills.filter(p => p !== pill);
                              setSearchPills(newPills);
                              logSearchPillsActivity(newPills, disregardedPills);
                              // Clear industry selection and excluded terms if this industry is removed
                              if (selectedIndustry.toLowerCase() === pill) {
                                setSelectedIndustry("");
                                setExcludedTerms([]);
                              }
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#fff",
                              cursor: "pointer",
                              fontSize: "0.875rem",
                              padding: "0",
                              marginLeft: "0.25rem",
                            }}
                            title="Remove"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                </div>
              </div>
            </div>
          );
        })()}

        {searchPills.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <span style={{
              fontSize: "0.875rem",
              fontWeight: "600",
              // color: "#374151",
              color: "white",
              marginRight: "12px"
            }}>
              Include
            </span>
            {searchPills.map((pill) => (
              <span
                key={pill}
                style={{
                  display: "inline-block",
                  background: "#0ccf83",
                  color: "#fff",
                  borderRadius: "999px",
                  padding: "6px 16px",
                  marginRight: "8px",
                  fontWeight: "bold",
                  fontSize: "0.95rem",
                  marginBottom: "4px",
                }}
              >
                {pill}
                <span
                  style={{
                    marginLeft: 8,
                    cursor: "pointer",
                    fontWeight: "normal",
                    color: "#fff",
                  }}
                  onClick={() => {
                    const newPills = searchPills.filter(p => p !== pill);
                    setSearchPills(newPills);
                    logSearchPillsActivity(newPills, disregardedPills); // Log pill removal
                    // Clear industry selection and excluded terms if this industry is removed
                    if (selectedIndustry.toLowerCase() === pill) {
                      setSelectedIndustry("");
                      setExcludedTerms([]);
                    }
                  }}
                  title="Remove"
                >
                  ×
                </span>
              </span>
            ))}
          </div>
        )}

        {disregardedPills.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <span style={{
              fontSize: "0.875rem",
              fontWeight: "600",
              // color: "#374151",
              color: "white",
              marginRight: "12px"
            }}>
              Exclude
            </span>
            {disregardedPills.map((pill) => (
              <span
                key={pill}
                style={{
                  display: "inline-block",
                  background: "#5f6163",
                  color: "#fff",
                  borderRadius: "999px",
                  padding: "6px 16px",
                  marginRight: "8px",
                  fontWeight: "bold",
                  fontSize: "0.95rem",
                  marginBottom: "4px",
                  // border: "2px dashed #fff",
                }}
              >
                ✕ {pill}
                <span
                  style={{
                    marginLeft: 8,
                    cursor: "pointer",
                    fontWeight: "normal",
                    color: "#fff",
                  }}
                  onClick={() => {
                    setDisregardedPills(disregardedPills.filter(p => p !== pill));
                  }}
                  title="Remove"
                >
                  ×
                </span>
              </span>
            ))}
          </div>
        )}
        {/* Filters */}
        <div className="job-filters">
          <input
            placeholder="Search jobs... (Press Enter to add search pill, Shift+Enter to add disregarded pill)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                const term = searchTerm.trim().toLowerCase();
                if (term) {
                  if (e.shiftKey) {
                    // Create disregarded pill (exclude jobs with this term)
                    if (!disregardedPills.includes(term)) {
                      setDisregardedPills([...disregardedPills, term]);
                    }
                  } else {
                    // Create regular search pill (include jobs with this term)
                    if (!searchPills.includes(term)) {
                      const newPills = [...searchPills, term];
                      setSearchPills(newPills);
                      logSearchPillsActivity(newPills, disregardedPills); // Log pill addition
                    }
                  }
                }
                setSearchTerm("");
                e.preventDefault();
              }
            }}
            style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "1rem" }}
          />



          {/* Search Instructions */}
          <div style={{
            marginBottom: "1rem",
            padding: "0.75rem",
            // background: "#f3f4f6",
            borderRadius: "8px",
            fontSize: "0.875rem",
            // color: "#6b7280",
            color: "white",
            border: "1px solid #0ccf83"
          }}>
            <div style={{
              marginBottom: "0.25rem",
              color: "#0ccf83"
            }}>
              <strong>Search Tips</strong>
            </div>
            <br></br>
            <div>
              • Press <kbd style={{
                padding: "2px 6px",
                background: "black",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                fontSize: "0.75rem",
                color: "white"
              }}>Enter</kbd> to add search terms that <span style={{ color: "#0ccf83", fontWeight: "600" }}>include</span> jobs
            </div>
            <br></br>
            <div>
              • Press <kbd style={{
                padding: "2px 6px",
                background: "black",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                fontSize: "0.75rem",
                color: "white"
              }}>Shift + Enter</kbd> to add terms that <span style={{ color: "grey", fontWeight: "600" }}>exclude</span> jobs
            </div>
          </div>
        </div>



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

