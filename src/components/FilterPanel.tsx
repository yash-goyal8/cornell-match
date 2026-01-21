import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Program, Studio } from "@/types";
import { studioInfo, programColors } from "@/data/mockData";

const ALL_SKILLS = [
  "Product Strategy",
  "Marketing",
  "Finance",
  "Full-Stack Development",
  "Machine Learning",
  "Cloud Architecture",
  "IP Law",
  "Contract Negotiation",
  "Regulatory Compliance",
  "Data Science",
  "Python",
  "Statistical Analysis",
  "Healthcare Operations",
  "UX Research",
  "Clinical Workflows",
  "Product Management",
  "Backend Development",
  "Frontend Development",
  "UI/UX Design",
  "Business Development",
];

const ALL_PROGRAMS: Program[] = ["MEng-CS", "MEng-DSDA", "MEng-ECE", "CM", "DesignTech", "HealthTech", "UrbanTech", "MBA", "LLM"];
const ALL_STUDIOS: Studio[] = ["bigco", "startup", "pitech"];

export interface PeopleFilters {
  skills: string[];
  programs: Program[];
  studios: Studio[];
}

export interface TeamFilters {
  skillsNeeded: string[];
  lookingFor: Program[];
  studios: Studio[];
  teamSize: number | null; // null means no filter
}

interface FilterPanelProps {
  type: "people" | "teams";
  peopleFilters?: PeopleFilters;
  teamFilters?: TeamFilters;
  onPeopleFiltersChange?: (filters: PeopleFilters) => void;
  onTeamFiltersChange?: (filters: TeamFilters) => void;
}

export const FilterPanel = ({
  type,
  peopleFilters,
  teamFilters,
  onPeopleFiltersChange,
  onTeamFiltersChange,
}: FilterPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters =
    type === "people"
      ? (peopleFilters?.skills.length || 0) > 0 ||
        (peopleFilters?.programs.length || 0) > 0 ||
        (peopleFilters?.studios.length || 0) > 0
      : (teamFilters?.skillsNeeded.length || 0) > 0 ||
        (teamFilters?.lookingFor.length || 0) > 0 ||
        (teamFilters?.studios.length || 0) > 0 ||
        teamFilters?.teamSize !== null;

  const activeFilterCount =
    type === "people"
      ? (peopleFilters?.skills.length || 0) +
        (peopleFilters?.programs.length || 0) +
        (peopleFilters?.studios.length || 0)
      : (teamFilters?.skillsNeeded.length || 0) +
        (teamFilters?.lookingFor.length || 0) +
        (teamFilters?.studios.length || 0) +
        (teamFilters?.teamSize !== null ? 1 : 0);

  const clearAllFilters = () => {
    if (type === "people" && onPeopleFiltersChange) {
      onPeopleFiltersChange({ skills: [], programs: [], studios: [] });
    } else if (type === "teams" && onTeamFiltersChange) {
      onTeamFiltersChange({ skillsNeeded: [], lookingFor: [], studios: [], teamSize: null });
    }
  };

  const toggleSkill = (skill: string) => {
    if (type === "people" && peopleFilters && onPeopleFiltersChange) {
      const newSkills = peopleFilters.skills.includes(skill)
        ? peopleFilters.skills.filter((s) => s !== skill)
        : [...peopleFilters.skills, skill];
      onPeopleFiltersChange({ ...peopleFilters, skills: newSkills });
    } else if (type === "teams" && teamFilters && onTeamFiltersChange) {
      const newSkills = teamFilters.skillsNeeded.includes(skill)
        ? teamFilters.skillsNeeded.filter((s) => s !== skill)
        : [...teamFilters.skillsNeeded, skill];
      onTeamFiltersChange({ ...teamFilters, skillsNeeded: newSkills });
    }
  };

  const toggleProgram = (program: Program) => {
    if (type === "people" && peopleFilters && onPeopleFiltersChange) {
      const newPrograms = peopleFilters.programs.includes(program)
        ? peopleFilters.programs.filter((p) => p !== program)
        : [...peopleFilters.programs, program];
      onPeopleFiltersChange({ ...peopleFilters, programs: newPrograms });
    } else if (type === "teams" && teamFilters && onTeamFiltersChange) {
      const newLookingFor = teamFilters.lookingFor.includes(program)
        ? teamFilters.lookingFor.filter((p) => p !== program)
        : [...teamFilters.lookingFor, program];
      onTeamFiltersChange({ ...teamFilters, lookingFor: newLookingFor });
    }
  };

  const toggleStudio = (studio: Studio) => {
    if (type === "people" && peopleFilters && onPeopleFiltersChange) {
      const newStudios = peopleFilters.studios.includes(studio)
        ? peopleFilters.studios.filter((s) => s !== studio)
        : [...peopleFilters.studios, studio];
      onPeopleFiltersChange({ ...peopleFilters, studios: newStudios });
    } else if (type === "teams" && teamFilters && onTeamFiltersChange) {
      const newStudios = teamFilters.studios.includes(studio)
        ? teamFilters.studios.filter((s) => s !== studio)
        : [...teamFilters.studios, studio];
      onTeamFiltersChange({ ...teamFilters, studios: newStudios });
    }
  };

  const setTeamSize = (size: number | null) => {
    if (type === "teams" && teamFilters && onTeamFiltersChange) {
      onTeamFiltersChange({ ...teamFilters, teamSize: size });
    }
  };

  return (
    <div className="w-full">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 px-2 py-0 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </Button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-4 rounded-xl glass border border-border/50 space-y-4">
              {hasActiveFilters && (
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs text-muted-foreground">
                    <X className="w-3 h-3 mr-1" />
                    Clear all
                  </Button>
                </div>
              )}

              {/* Skills Filter */}
              <div>
                <h4 className="text-sm font-medium mb-2">
                  {type === "people" ? "Skills" : "Skills Needed"}
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {ALL_SKILLS.slice(0, 12).map((skill) => {
                    const isSelected =
                      type === "people"
                        ? peopleFilters?.skills.includes(skill)
                        : teamFilters?.skillsNeeded.includes(skill);
                    return (
                      <Badge
                        key={skill}
                        variant={isSelected ? "default" : "outline"}
                        className={`cursor-pointer text-xs transition-all hover:scale-105 ${
                          !isSelected ? "hover:bg-orange-100 hover:border-orange-300 hover:text-orange-700" : ""
                        }`}
                        onClick={() => toggleSkill(skill)}
                      >
                        {skill}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Program Filter */}
              <div>
                <h4 className="text-sm font-medium mb-2">
                  {type === "people" ? "Program" : "Looking For"}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_PROGRAMS.map((program) => {
                    const isSelected =
                      type === "people"
                        ? peopleFilters?.programs.includes(program)
                        : teamFilters?.lookingFor.includes(program);
                    return (
                      <Badge
                        key={program}
                        variant={isSelected ? "default" : "outline"}
                        className={`cursor-pointer text-xs transition-all hover:scale-105 ${
                          isSelected ? programColors[program] + " text-white border-transparent" : "hover:bg-orange-100 hover:border-orange-300 hover:text-orange-700"
                        }`}
                        onClick={() => toggleProgram(program)}
                      >
                        {program}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Studio Filter */}
              <div>
                <h4 className="text-sm font-medium mb-2">Studio Preference</h4>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_STUDIOS.map((studio) => {
                    const isSelected =
                      type === "people"
                        ? peopleFilters?.studios.includes(studio)
                        : teamFilters?.studios.includes(studio);
                    const studioData = studioInfo[studio];
                    return (
                      <Badge
                        key={studio}
                        variant={isSelected ? "default" : "outline"}
                        className={`cursor-pointer text-xs transition-all hover:scale-105 ${
                          isSelected ? studioData.color + " text-white border-transparent" : "hover:bg-orange-100 hover:border-orange-300 hover:text-orange-700"
                        }`}
                        onClick={() => toggleStudio(studio)}
                      >
                        {studioData.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Team Size Filter (Teams only) */}
              {type === "teams" && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Team Size</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "Any", value: null },
                      { label: "1 member", value: 1 },
                      { label: "2 members", value: 2 },
                      { label: "3 members", value: 3 },
                      { label: "4+ members", value: 4 },
                    ].map((option) => (
                      <Badge
                        key={option.label}
                        variant={teamFilters?.teamSize === option.value ? "default" : "outline"}
                        className={`cursor-pointer text-xs transition-all hover:scale-105 ${
                          teamFilters?.teamSize !== option.value ? "hover:bg-orange-100 hover:border-orange-300 hover:text-orange-700" : ""
                        }`}
                        onClick={() => setTeamSize(option.value)}
                      >
                        {option.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
