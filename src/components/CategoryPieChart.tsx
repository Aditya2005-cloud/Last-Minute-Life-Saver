import React, { useEffect, useRef, useMemo, useState } from "react";
import * as d3 from "d3";
import { motion } from "motion/react";
import { Task } from "../types";
import { TrendingUp, TrendingDown, Minus, Percent, Hash, Flame, History } from "lucide-react";

interface CategoryPieChartProps {
  tasks: Task[];
  selectedCategory: string;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  tasks,
  selectedCategory,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [displayMode, setDisplayMode] = useState<"percentage" | "count">("percentage");
  const [viewMode, setViewMode] = useState<"live" | "historical">("live");
  const [trendDays, setTrendDays] = useState<7 | 14 | 30>(7);

  // Filter tasks belonging to the current category
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedCategory === "all") return true;
      return t.category?.toLowerCase() === selectedCategory.toLowerCase();
    });
  }, [tasks, selectedCategory]);

  // Live Counts
  const completedCount = useMemo(() => {
    return filteredTasks.filter((t) => t.completed).length;
  }, [filteredTasks]);

  const remainingCount = useMemo(() => {
    return filteredTasks.length - completedCount;
  }, [filteredTasks, completedCount]);

  const totalCount = filteredTasks.length;

  // Historical Counts (Past 30 Days)
  const { historicalCompleted, historicalRemaining } = useMemo(() => {
    const thirtyDaysAgo = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
    
    const completed = filteredTasks.filter((t) => {
      if (!t.completed || !t.completedAt) return false;
      return new Date(t.completedAt).getTime() >= thirtyDaysAgo;
    }).length;

    const remaining = filteredTasks.filter((t) => {
      if (t.completed) return false;
      const createdTime = t.createdAt ? new Date(t.createdAt).getTime() : 0;
      const dueTime = t.dueDate ? new Date(t.dueDate).getTime() : 0;
      return createdTime >= thirtyDaysAgo || dueTime >= thirtyDaysAgo;
    }).length;

    return { historicalCompleted: completed, historicalRemaining: remaining };
  }, [filteredTasks]);

  // Active Counts based on the current ViewMode
  const activeCompleted = viewMode === "live" ? completedCount : historicalCompleted;
  const activeRemaining = viewMode === "live" ? remainingCount : historicalRemaining;
  const activeTotal = activeCompleted + activeRemaining;

  // Pie chart data payload based on selected view mode
  const data = useMemo(() => {
    if (activeTotal === 0) {
      return [
        { label: "completed", value: 0, color: "#10b981" },
        { label: "remaining", value: 1, color: "#4b5563" }, // dark neutral fallback
      ];
    }
    return [
      { label: "completed", value: activeCompleted, color: "#10b981" }, // Emerald Completed
      { label: "remaining", value: activeRemaining, color: "#f59e0b" }, // Amber Remaining (Theme accent)
    ];
  }, [activeCompleted, activeRemaining, activeTotal]);

  // Keep track of the previous angles for D3 arc tween interpolation
  const prevAnglesRef = useRef<d3.PieArcDatum<{ label: string; value: number; color: string }>[]>([]);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 18;
    const height = 18;
    const radius = Math.min(width, height) / 2;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous children to prevent duplicates during concurrent/re-renders

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Define the pie generator layout
    const pie = d3
      .pie<{ label: string; value: number; color: string }>()
      .value((d) => d.value)
      .sort(null); // Keep array order to prevent slice jumping/flashing

    const arc = d3
      .arc<d3.PieArcDatum<{ label: string; value: number; color: string }>>()
      .innerRadius(3) // Beautiful subtle donut ring style
      .outerRadius(radius);

    const arcData = pie(data);

    // Render paths
    const paths = g
      .selectAll("path")
      .data(arcData)
      .enter()
      .append("path")
      .attr("fill", (d) => d.data.color)
      .attr("stroke", "rgba(0, 0, 0, 0.15)")
      .attr("stroke-width", "0.5");

    // Perform smooth transitional interpolation
    paths
      .transition()
      .duration(450)
      .ease(d3.easeCubicInOut)
      .attrTween("d", function (d, i) {
        const prev = prevAnglesRef.current[i] || { startAngle: 0, endAngle: 0 };
        const interpolateStart = d3.interpolate(prev.startAngle, d.startAngle);
        const interpolateEnd = d3.interpolate(prev.endAngle, d.endAngle);

        return function (t) {
          const currentArc = {
            ...d,
            startAngle: interpolateStart(t),
            endAngle: interpolateEnd(t),
          };
          return arc(currentArc) || "";
        };
      });

    // Store current angles for future transition updates
    prevAnglesRef.current = arcData;
  }, [data]);

  const percentage = activeTotal > 0 ? Math.round((activeCompleted / activeTotal) * 100) : 0;

  // Calculate completion rate trend over the selected days vs previous period
  const trendInfo = useMemo(() => {
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const daysAgo = now.getTime() - trendDays * oneDayMs;
    const doubleDaysAgo = now.getTime() - 2 * trendDays * oneDayMs;

    let completedA = 0;
    let totalA = 0;
    let completedB = 0;
    let totalB = 0;

    filteredTasks.forEach((task) => {
      const completedTime = task.completedAt ? new Date(task.completedAt).getTime() : null;
      const createdTime = task.createdAt 
        ? new Date(task.createdAt).getTime() 
        : (task.dueDate ? new Date(task.dueDate).getTime() : now.getTime());

      // Period A: Last trendDays days
      const isCompletedInA = completedTime && completedTime >= daysAgo && completedTime <= now.getTime();
      const isCreatedInA = createdTime >= daysAgo && createdTime <= now.getTime();
      
      if (isCompletedInA) {
        completedA++;
      }
      if (isCreatedInA || isCompletedInA) {
        totalA++;
      }

      // Period B: Prior period (trendDays to 2*trendDays days ago)
      const isCompletedInB = completedTime && completedTime >= doubleDaysAgo && completedTime < daysAgo;
      const isCreatedInB = createdTime >= doubleDaysAgo && createdTime < daysAgo;

      if (isCompletedInB) {
        completedB++;
      }
      if (isCreatedInB || isCompletedInB) {
        totalB++;
      }
    });

    const rateA = totalA > 0 ? completedA / totalA : 0;
    const rateB = totalB > 0 ? completedB / totalB : 0;

    let trend: "Increasing" | "Decreasing" | "Stable" = "Stable";
    let color = "text-zinc-500 dark:text-zinc-400";
    let bg = "bg-zinc-500/10";
    let icon = "→";

    if (totalA === 0 && totalB === 0) {
      return { trend, color, bg, icon, rateA, rateB, completedA, totalA, completedB, totalB, isSignificantImprovement: false };
    }

    const diff = rateA - rateB;
    // 1% tolerance for "Stable"
    if (diff > 0.01) {
      trend = "Increasing";
      color = "text-emerald-500 dark:text-emerald-400";
      bg = "bg-emerald-500/10";
      icon = "▲";
    } else if (diff < -0.01) {
      trend = "Decreasing";
      color = "text-rose-500 dark:text-rose-400";
      bg = "bg-rose-500/10";
      icon = "▼";
    }

    return { trend, color, bg, icon, rateA, rateB, completedA, totalA, completedB, totalB, isSignificantImprovement: diff > 0.1 };
  }, [filteredTasks, trendDays]);

  // Compute the precise Lucide icon next to the trend label
  const trendIconElement = useMemo(() => {
    switch (trendInfo.trend) {
      case "Increasing":
        return <TrendingUp className="h-2 w-2 text-emerald-500 shrink-0" />;
      case "Decreasing":
        return <TrendingDown className="h-2 w-2 text-rose-500 shrink-0" />;
      case "Stable":
      default:
        return <Minus className="h-2 w-2 text-amber-500 shrink-0" />;
    }
  }, [trendInfo.trend]);

  return (
    <div className="flex items-center gap-1.5 shrink-0" id="category-pie-chart-root">
      <div
        className="flex flex-col items-center shrink-0 justify-center select-none cursor-help relative group"
        title={`${activeCompleted}/${activeTotal} Tasks Completed (${percentage}%) [${viewMode.toUpperCase()}] in ${
          selectedCategory === "all" ? "All Categories" : selectedCategory
        }. ${trendDays}-Day Trend: ${trendInfo.trend} (Last ${trendDays} days: ${
          displayMode === "percentage" 
            ? `${Math.round(trendInfo.rateA * 100)}%` 
            : `${trendInfo.completedA}/${trendInfo.totalA} tasks`
        } vs Prior ${trendDays} days: ${
          displayMode === "percentage" 
            ? `${Math.round(trendInfo.rateB * 100)}%` 
            : `${trendInfo.completedB}/${trendInfo.totalB} tasks`
        })`}
      >
        <motion.div 
          className="flex items-center justify-center h-[18px]"
          whileHover={{ scale: 1.15 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          <svg
            ref={svgRef}
            width="18"
            height="18"
          />
        </motion.div>
        
        {/* Small Animated Trend text label beneath the chart */}
        <motion.span
          key={`${selectedCategory}-${trendInfo.trend}-${trendInfo.isSignificantImprovement}`}
          initial={{ opacity: 0, y: 2 }}
          animate={
            trendInfo.isSignificantImprovement
              ? {
                  scale: [1, 1.08, 1],
                  opacity: [0.9, 1, 0.9],
                  y: 0,
                  boxShadow: [
                    "0 0 0 0 rgba(16, 185, 129, 0)",
                    "0 0 0 4px rgba(16, 185, 129, 0.2)",
                    "0 0 0 0 rgba(16, 185, 129, 0)"
                  ]
                }
              : { opacity: 1, y: 0 }
          }
          transition={
            trendInfo.isSignificantImprovement
              ? {
                  scale: {
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "easeInOut"
                  },
                  opacity: {
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "easeInOut"
                  },
                  boxShadow: {
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "easeInOut"
                  },
                  y: { duration: 0.3 }
                }
              : { duration: 0.3, ease: "easeOut" }
          }
          className={`text-[7px] font-mono leading-none tracking-wider font-extrabold uppercase mt-0.5 px-1.5 py-0.5 rounded-sm ${trendInfo.bg} ${trendInfo.color} flex items-center gap-1 shadow-sm`}
        >
          {trendIconElement}
          <span>{trendInfo.trend}</span>
        </motion.span>
        
        {/* Mini Tooltip overlay on hover */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50">
          <div className="bg-zinc-900 text-white text-[9px] font-mono py-1 px-1.5 rounded shadow-lg whitespace-nowrap border border-zinc-800 flex flex-col gap-0.5 items-center">
            <div className="font-semibold text-center flex items-center gap-1">
              {viewMode === "live" ? (
                <>
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                  <span>🔴 Live Category</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  <span>🗓️ 30d Historical</span>
                </>
              )}
            </div>
            <div className="text-zinc-300 text-center font-bold">
              {displayMode === "percentage" ? `${percentage}% Completed` : `${activeCompleted} of ${activeTotal} Done`}
            </div>
            <div className="text-[8px] text-zinc-400 text-center">
              Trend ({trendDays}d): {displayMode === "percentage" 
                ? `${Math.round(trendInfo.rateA * 100)}% vs ${Math.round(trendInfo.rateB * 100)}%`
                : `${trendInfo.completedA}/${trendInfo.totalA} vs ${trendInfo.completedB}/${trendInfo.totalB} tasks`
              }
            </div>
          </div>
          <div className="w-1.5 h-1.5 bg-zinc-900 rotate-45 -mt-1 border-r border-b border-zinc-800" />
        </div>
      </div>

      {/* Control Buttons Group */}
      <div className="flex items-center gap-1 shrink-0 ml-1">
        {/* Toggle between Percentage and Count */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation(); // prevent parent toggling behavior
            setDisplayMode((prev) => (prev === "percentage" ? "count" : "percentage"));
          }}
          className="p-1 rounded bg-zinc-200/50 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 border border-zinc-300/30 dark:border-zinc-700/30 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-all duration-150 flex items-center justify-center shrink-0 cursor-pointer"
          title={`Toggle to display ${displayMode === "percentage" ? "Absolute count" : "Percentage"}`}
        >
          {displayMode === "percentage" ? (
            <Percent className="h-2.5 w-2.5" />
          ) : (
            <Hash className="h-2.5 w-2.5" />
          )}
        </button>

        {/* Toggle between Live and Historical */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation(); // prevent parent toggling behavior
            setViewMode((prev) => (prev === "live" ? "historical" : "live"));
          }}
          className={`p-1 rounded border transition-all duration-150 flex items-center justify-center shrink-0 cursor-pointer ${
            viewMode === "historical"
              ? "bg-amber-100 dark:bg-amber-950/40 border-amber-300/40 text-amber-600 dark:text-amber-400 font-bold"
              : "bg-zinc-200/50 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 border-zinc-300/30 dark:border-zinc-700/30 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
          title={`Switch to ${viewMode === "live" ? "Historical View (Past 30 Days)" : "Live Active View"}`}
        >
          {viewMode === "live" ? (
            <Flame className="h-2.5 w-2.5" />
          ) : (
            <History className="h-2.5 w-2.5" />
          )}
        </button>

        {/* Toggle Trend Days Dropdown Menu */}
        <select
          value={trendDays}
          onChange={(e) => {
            e.stopPropagation(); // prevent parent toggling behavior
            setTrendDays(Number(e.target.value) as 7 | 14 | 30);
          }}
          className="p-1 rounded bg-zinc-200/50 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 border border-zinc-300/30 dark:border-zinc-700/30 text-[9px] font-mono font-bold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-all duration-150 outline-none cursor-pointer"
          title="Select completion trend range (7, 14, or 30 days)"
        >
          <option value="7" className="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 font-mono">7d</option>
          <option value="14" className="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 font-mono">14d</option>
          <option value="30" className="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 font-mono">30d</option>
        </select>
      </div>
    </div>
  );
};
