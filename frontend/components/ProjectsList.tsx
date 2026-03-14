"use client";
import apiClient from "@/lib/apiClient";
import { getApiHeaders } from "@/lib/apiBase";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Play,
  Clock,
  BarChart3,
  FileJson,
  PlayCircle,
  Layers,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
  ExternalLink,
} from "lucide-react";

import SchedulerModal from "./SchedulerModal";
import ColumnStatisticsModal from "./ColumnStatisticsModal";
import CSVDataModal from "./CSVDataModal";

interface Project {
  token: string;
  name?: string;
  title?: string;
  owner_email?: string;
  projecturl?: string;
  main_site?: string;
  last_run?: {
    status: string;
    pages: number;
    start_time: string;
    run_token: string;
  } | null;
}

interface ProjectsListProps {
  projects: Project[];
  onRunProject: (token: string) => Promise<void>;
}

export default function ProjectsList({
  projects,
  onRunProject,
}: ProjectsListProps) {
  const router = useRouter();

  const [groupedByBrand, setGroupedByBrand] = useState<Map<string, Project[]>>(
    new Map(),
  );
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
  const [pageInputs, setPageInputs] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState<string | null>(null);

  const [showScheduler, setShowScheduler] = useState(false);
  const [selectedProjectForSchedule, setSelectedProjectForSchedule] = useState<
    string | null
  >(null);

  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);

  const [selectedProjectToken, setSelectedProjectToken] = useState<
    string | null
  >(null);
  const [selectedProjectName, setSelectedProjectName] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const extractWebsite = (projectName: string): string => {
      const match = projectName.match(/\)\s*([^_\s]+(?:\.[^_\s]+)*?)_/);
      if (match && match[1]) {
        return match[1];
      }
      return projectName.substring(0, 30) || "Other";
    };

    const groups = new Map<string, Project[]>();

    projects.forEach((project) => {
      const projectName = project.name || project.title || "Unknown";
      const website = extractWebsite(projectName);

      if (!groups.has(website)) {
        groups.set(website, []);
      }

      groups.get(website)!.push({
        ...project,
        name: projectName,
      });
    });

    setGroupedByBrand(groups);
  }, [projects]);

  const toggleBrand = (brand: string) => {
    setExpandedBrands((prev) => {
      const newSet = new Set(prev);
      newSet.has(brand) ? newSet.delete(brand) : newSet.add(brand);
      return newSet;
    });
  };

  const handleRunProject = async (token: string) => {
    setLoading(token);
    try {
      await onRunProject(token);
    } finally {
      setLoading(null);
    }
  };

  const handleRunAll = async (brand: string) => {
    const brandProjects = groupedByBrand.get(brand);
    if (!brandProjects) return;

    for (const project of brandProjects) {
      try {
        await handleRunProject(project.token);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to run ${project.name}:`, error);
      }
    }
  };

  const handleScheduleClick = (token: string) => {
    setSelectedProjectForSchedule(token);
    setShowScheduler(true);
  };

  const handleViewStats = (token: string, name: string) => {
    setSelectedProjectToken(token);
    setSelectedProjectName(name);
    setShowStatsModal(true);
  };

  const handleViewCSV = (token: string, name: string) => {
    setSelectedProjectToken(token);
    setSelectedProjectName(name);
    setShowCSVModal(true);
  };

  // FIXED STOP PROJECT FUNCTION
  const handleCancelRun = async (runToken: string) => {
    setLoading(runToken);
    try {
      const response = await fetch(`/api/runs/${runToken}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getApiHeaders(),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to stop project");
      }

      console.log("Run cancelled successfully:", data);
      alert("Project run stopped successfully.");

      window.dispatchEvent(new CustomEvent("projectStatusUpdated"));
      router.refresh();
    } catch (error) {
      console.error("Error stopping project:", error);
      alert(
        `Failed to stop project: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    } finally {
      setLoading(null);
    }
  };

  const handlePageChange = (token: string, value: string) => {
    setPageInputs((prev) => ({
      ...prev,
      [token]: value,
    }));
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;

    const statusConfig = {
      complete: {
        icon: CheckCircle2,
        label: "Completed",
        className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      },
      running: {
        icon: Loader2,
        label: "Running",
        className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      },
      queued: {
        icon: Clock,
        label: "Queued",
        className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      },
      error: {
        icon: AlertCircle,
        label: "Error",
        className: "bg-red-500/20 text-red-400 border-red-500/30",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.queued;

    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.className}`}
      >
        <Icon
          size={12}
          className={status === "running" ? "animate-spin" : ""}
        />
        {config.label}
      </span>
    );
  };

  return (
    <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            {Array.from(groupedByBrand.entries()).map(([brand, brandProjects]) => (
              <React.Fragment key={brand}>
                {expandedBrands.has(brand) &&
                  brandProjects.map((project) => (
                    <tr
                      key={project.token}
                      onClick={() => router.push(`/projects/${project.token}`)}
                    >
                      <td>{project.name}</td>

                      <td>{getStatusBadge(project.last_run?.status)}</td>

                      <td>
                        <div className="flex gap-2">

                          {/* VIEW */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/projects/${project.token}`);
                            }}
                          >
                            <ExternalLink size={14} />
                          </button>

                          {/* RUN */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRunProject(project.token);
                            }}
                          >
                            <Play size={14} />
                          </button>

                          {/* STOP RUN */}
                          {project.last_run?.status === "running" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelRun(
                                  project.last_run?.run_token ||
                                    project.token,
                                );
                              }}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
