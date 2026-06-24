import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell, Activity, ShieldPlus, History, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/gym")({
  component: GymPage,
  head: () => ({ meta: [{ title: "Gym - 90-Day Life OS" }] }),
});

// ─── Stretching routines per workout type ───────────────────────────────────
const STRETCH_UPPER = {
  name: "Warm-up & Stretching",
  sets: "3 mins",
  reps: "Arm circles → Shoulder pass-throughs → Neck rolls → Chest openers. Hold each 30s.",
  isStretch: true,
  image: "/stretch_guide.png",
};
const STRETCH_LOWER = {
  name: "Warm-up & Stretching",
  sets: "3 mins",
  reps: "Leg swings → Hip flexor lunges → Ankle rolls → Deep squat hold. Hold each 30s.",
  isStretch: true,
  image: "/stretch_guide.png",
};
const STRETCH_FULL = {
  name: "Warm-up & Stretching",
  sets: "3 mins",
  reps: "Downward dog → Inchworms → Torso twists → Dynamic lunges. Hold each 30s.",
  isStretch: true,
  image: "/stretch_guide.png",
};

// ─── Workout data ─────────────────────────────────────────────────────────────
const UPPER_WORKOUTS = [
  {
    type: "Upper Body",
    title: "Push & Pull Basics",
    description: "Focus on chest, back, and arms.",
    image: "/upper_body_guide.png",
    exercises: [
      STRETCH_UPPER,
      { name: "Push-ups", sets: "3", reps: "10-15 (or to failure)", image: "/upper_body_guide.png" },
      { name: "DB Floor Presses (4kg)", sets: "3", reps: "15-20", image: "/upper_body_guide.png" },
      { name: "DB Bent-Over Rows (4kg)", sets: "3", reps: "15-20", image: "/upper_body_guide.png" },
      { name: "DB Bicep Curls (4kg)", sets: "3", reps: "15", image: "/upper_body_guide.png" },
      { name: "DB Lateral Raises (4kg)", sets: "3", reps: "12-15", image: "/upper_body_guide.png" },
      { name: "Cooldown Stretch", sets: "2 mins", reps: "Arm across chest → Tricep overhead → Child's pose. Hold each 30s.", isStretch: true, image: "/stretch_guide.png" },
    ],
  },
  {
    type: "Upper Body",
    title: "Upper Burner",
    description: "High repetition upper body conditioning.",
    image: "/upper_body_guide.png",
    exercises: [
      STRETCH_UPPER,
      { name: "Pike Push-ups", sets: "3", reps: "8-12", image: "/upper_body_guide.png" },
      { name: "DB Arnold Press (4kg)", sets: "4", reps: "15", image: "/upper_body_guide.png" },
      { name: "DB Renegade Rows (4kg)", sets: "3", reps: "10 per side", image: "/upper_body_guide.png" },
      { name: "DB Tricep Extensions (4kg)", sets: "3", reps: "15", image: "/upper_body_guide.png" },
      { name: "Plank Hold", sets: "3", reps: "45-60 secs", image: "/upper_body_guide.png" },
      { name: "Cooldown Stretch", sets: "2 mins", reps: "Arm across chest → Tricep overhead → Child's pose. Hold each 30s.", isStretch: true, image: "/stretch_guide.png" },
    ],
  },
  {
    type: "Upper Body",
    title: "Shoulders & Core",
    description: "Target shoulders and core stability.",
    image: "/upper_body_guide.png",
    exercises: [
      STRETCH_UPPER,
      { name: "DB Shoulder Press (4kg)", sets: "4", reps: "12-15", image: "/upper_body_guide.png" },
      { name: "DB Front Raises (4kg)", sets: "3", reps: "12", image: "/upper_body_guide.png" },
      { name: "DB Upright Rows (4kg)", sets: "3", reps: "15", image: "/upper_body_guide.png" },
      { name: "Russian Twists (4kg)", sets: "3", reps: "20 per side", image: "/upper_body_guide.png" },
      { name: "Plank to Push-up", sets: "3", reps: "10", image: "/upper_body_guide.png" },
      { name: "Cooldown Stretch", sets: "2 mins", reps: "Arm across chest → Tricep overhead → Child's pose. Hold each 30s.", isStretch: true, image: "/stretch_guide.png" },
    ],
  },
];

const LOWER_WORKOUTS = [
  {
    type: "Lower Body",
    title: "Leg Day Foundation",
    description: "Quads, hamstrings, and calves.",
    image: "/lower_body_guide.png",
    exercises: [
      STRETCH_LOWER,
      { name: "DB Goblet Squats (4kg)", sets: "4", reps: "15-20", image: "/lower_body_guide.png" },
      { name: "DB Reverse Lunges (4kg)", sets: "3", reps: "12 per leg", image: "/lower_body_guide.png" },
      { name: "DB Romanian Deadlifts (4kg)", sets: "4", reps: "15", image: "/lower_body_guide.png" },
      { name: "Glute Bridges (Bodyweight)", sets: "3", reps: "20", image: "/lower_body_guide.png" },
      { name: "Standing Calf Raises (4kg)", sets: "4", reps: "25", image: "/lower_body_guide.png" },
      { name: "Cooldown Stretch", sets: "2 mins", reps: "Standing quad stretch → Seated hamstring stretch → Figure-4 glute stretch. Hold each 30s.", isStretch: true, image: "/stretch_guide.png" },
    ],
  },
  {
    type: "Lower Body",
    title: "Plyo & Power",
    description: "Explosive movements for leg strength.",
    image: "/lower_body_guide.png",
    exercises: [
      STRETCH_LOWER,
      { name: "Jump Rope Double Unders (or fast pace)", sets: "5", reps: "1 min on, 30s off", image: "/lower_body_guide.png" },
      { name: "Jump Squats (Bodyweight)", sets: "4", reps: "15", image: "/lower_body_guide.png" },
      { name: "DB Front Squats (4kg)", sets: "3", reps: "20", image: "/lower_body_guide.png" },
      { name: "DB Split Squats (4kg)", sets: "3", reps: "10 per leg", image: "/lower_body_guide.png" },
      { name: "Wall Sit", sets: "3", reps: "60 secs", image: "/lower_body_guide.png" },
      { name: "Cooldown Stretch", sets: "2 mins", reps: "Standing quad stretch → Seated hamstring stretch → Figure-4 glute stretch. Hold each 30s.", isStretch: true, image: "/stretch_guide.png" },
    ],
  },
  {
    type: "Lower Body",
    title: "Endurance Legs",
    description: "High stamina and bodyweight burn.",
    image: "/lower_body_guide.png",
    exercises: [
      STRETCH_LOWER,
      { name: "Jump Rope", sets: "10 mins", reps: "Moderate pace", image: "/lower_body_guide.png" },
      { name: "Bodyweight Squats", sets: "4", reps: "25", image: "/lower_body_guide.png" },
      { name: "Walking Lunges (Bodyweight)", sets: "3", reps: "20 steps", image: "/lower_body_guide.png" },
      { name: "DB Sumo Squats (4kg)", sets: "3", reps: "20", image: "/lower_body_guide.png" },
      { name: "Calf Raises (Bodyweight)", sets: "3", reps: "30", image: "/lower_body_guide.png" },
      { name: "Cooldown Stretch", sets: "2 mins", reps: "Standing quad stretch → Seated hamstring stretch → Figure-4 glute stretch. Hold each 30s.", isStretch: true, image: "/stretch_guide.png" },
    ],
  },
];

const FULL_WORKOUTS = [
  {
    type: "Full Body",
    title: "Full Body HIIT",
    description: "Cardio and strength combined.",
    image: "/full_body_guide.png",
    exercises: [
      STRETCH_FULL,
      { name: "Jump Rope Warm-up", sets: "1 min", reps: "Light pace", image: "/full_body_guide.png" },
      { name: "DB Thrusters (Squat to Press, 4kg)", sets: "4", reps: "15", image: "/full_body_guide.png" },
      { name: "Burpees", sets: "4", reps: "10", image: "/full_body_guide.png" },
      { name: "DB Alternating Snatches (4kg)", sets: "4", reps: "10 per arm", image: "/full_body_guide.png" },
      { name: "Mountain Climbers", sets: "4", reps: "40 secs", image: "/full_body_guide.png" },
      { name: "Cooldown Stretch", sets: "2 mins", reps: "Downward dog → Child's pose → Pigeon stretch → Seated forward fold. Hold each 30s.", isStretch: true, image: "/stretch_guide.png" },
    ],
  },
  {
    type: "Full Body",
    title: "Core & Conditioning",
    description: "Total body burn with a focus on core stability.",
    image: "/full_body_guide.png",
    exercises: [
      STRETCH_FULL,
      { name: "Jump Rope", sets: "5 mins", reps: "Varying speeds", image: "/full_body_guide.png" },
      { name: "DB Man Makers (Pushup + Row + Squat Clean + Press, 4kg)", sets: "3", reps: "8-10", image: "/full_body_guide.png" },
      { name: "DB Goblet Squats (4kg)", sets: "3", reps: "20", image: "/full_body_guide.png" },
      { name: "Russian Twists (4kg)", sets: "3", reps: "20 per side", image: "/full_body_guide.png" },
      { name: "Leg Raises", sets: "3", reps: "15", image: "/full_body_guide.png" },
      { name: "Cooldown Stretch", sets: "2 mins", reps: "Downward dog → Child's pose → Pigeon stretch → Seated forward fold. Hold each 30s.", isStretch: true, image: "/stretch_guide.png" },
    ],
  },
  {
    type: "Full Body",
    title: "Strength & Sweat",
    description: "Building power and endurance.",
    image: "/full_body_guide.png",
    exercises: [
      STRETCH_FULL,
      { name: "Jump Rope", sets: "3 mins", reps: "Continuous", image: "/full_body_guide.png" },
      { name: "DB Deadlift to Upright Row (4kg)", sets: "4", reps: "15", image: "/full_body_guide.png" },
      { name: "DB Push Press (4kg)", sets: "4", reps: "15", image: "/full_body_guide.png" },
      { name: "Jump Squats", sets: "3", reps: "15", image: "/full_body_guide.png" },
      { name: "DB Renegade Rows (4kg)", sets: "3", reps: "10 per side", image: "/full_body_guide.png" },
      { name: "Cooldown Stretch", sets: "2 mins", reps: "Downward dog → Child's pose → Pigeon stretch → Seated forward fold. Hold each 30s.", isStretch: true, image: "/stretch_guide.png" },
    ],
  },
];

// ─── GymPage component ────────────────────────────────────────────────────────
function GymPage() {
  const { user } = useAuth();
  const uid = user!.id;
  const qc = useQueryClient();

  const [activeWorkout, setActiveWorkout] = useState<any>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());
  const [openInfoIdx, setOpenInfoIdx] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("upper");

  const logsQ = useQuery({
    queryKey: ["workout_logs", uid],
    queryFn: async () => {
      const { data } = await supabase
        .from("workout_logs")
        .select("*")
        .eq("user_id", uid)
        .order("completed_at", { ascending: false });
      return data ?? [];
    },
  });

  const handleStart = (workout: any) => {
    setActiveWorkout(workout);
    setCompletedExercises(new Set());
    setOpenInfoIdx(null);
  };

  const handleFinish = async () => {
    if (!activeWorkout) return;
    setIsSubmitting(true);
    const { error } = await supabase.from("workout_logs").insert({
      user_id: uid,
      workout_name: activeWorkout.title,
      workout_type: activeWorkout.type,
    });
    setIsSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const done = completedExercises.size;
    const total = activeWorkout.exercises.length;
    toast.success(`${activeWorkout.title} logged! (${done}/${total} exercises completed)`);
    qc.invalidateQueries({ queryKey: ["workout_logs", uid] });
    setActiveWorkout(null);
  };

  const tabToType: Record<string, string> = {
    upper: "Upper Body",
    lower: "Lower Body",
    full: "Full Body",
  };


  const workoutsForTab: Record<string, any[]> = {
    upper: UPPER_WORKOUTS,
    lower: LOWER_WORKOUTS,
    full: FULL_WORKOUTS,
  };

  const tabIcons: Record<string, React.ReactNode> = {
    upper: <Dumbbell className="size-4 text-primary" />,
    lower: <ShieldPlus className="size-4 text-emerald-500" />,
    full: <Activity className="size-4 text-rose-500" />,
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl md:text-5xl bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
          Home Gym
        </h1>
        <p className="mt-2 text-muted-foreground">
          Workouts designed for jump rope, 4kg dumbbells, or bodyweight.
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="upper">Upper</TabsTrigger>
          <TabsTrigger value="lower">Lower</TabsTrigger>
          <TabsTrigger value="full">Full</TabsTrigger>
        </TabsList>

        {["upper", "lower", "full"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {workoutsForTab[tab].map((workout) => (
                <WorkoutCard
                  key={workout.title}
                  workout={workout}
                  icon={tabIcons[tab]}
                  onStart={handleStart}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Global History — all workouts, most recent first */}
      <div className="pt-4 border-t">
        <h2 className="text-xl font-display flex items-center gap-2 mb-4">
          <History className="size-5 text-accent" />
          All Workout History
        </h2>
        {(logsQ.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No workouts logged yet. Time to get moving!</p>
        ) : (
          <div className="space-y-3">
            {(logsQ.data ?? []).map((log: any) => {
              const typeColors: Record<string, string> = {
                "Upper Body": "text-primary bg-primary/10",
                "Lower Body": "text-emerald-500 bg-emerald-500/10",
                "Full Body": "text-rose-500 bg-rose-500/10",
              };
              const colorCls = typeColors[log.workout_type] ?? "text-accent bg-accent/10";
              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between bg-card/60 border rounded-lg px-4 py-3 text-sm gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ${colorCls}`}>
                      {log.workout_type}
                    </span>
                    <span className="font-medium text-foreground truncate">{log.workout_name}</span>
                  </div>
                  <div className="text-muted-foreground text-xs font-medium whitespace-nowrap">
                    {format(new Date(log.completed_at), "EEE, MMM d · h:mm a")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Workout Dialog */}
      <Dialog open={!!activeWorkout} onOpenChange={(v) => !v && setActiveWorkout(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{activeWorkout?.title}</DialogTitle>
            <DialogDescription>
              Check off exercises as you complete them. You can finish anytime.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            {activeWorkout?.exercises.map((ex: any, idx: number) => {
              const isDone = completedExercises.has(idx);
              const isInfoOpen = openInfoIdx === idx;
              const isStretch = !!ex.isStretch;

              return (
                <div
                  key={idx}
                  className={`rounded-lg border transition ${
                    isStretch
                      ? "border-violet-500/30 bg-violet-500/5"
                      : isDone
                      ? "bg-card/40 opacity-60"
                      : "bg-card"
                  }`}
                >
                  <div className="flex items-start gap-3 p-3">
                    <Checkbox
                      checked={isDone}
                      onCheckedChange={(v) => {
                        const next = new Set(completedExercises);
                        if (v) next.add(idx);
                        else next.delete(idx);
                        setCompletedExercises(next);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-medium ${
                          isStretch
                            ? "text-violet-400"
                            : isDone
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {isStretch && "🧘 "}
                        {ex.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {ex.sets} • {ex.reps}
                      </div>
                    </div>
                    {ex.image && (
                      <button
                        onClick={() => setOpenInfoIdx(isInfoOpen ? null : idx)}
                        className="text-muted-foreground hover:text-foreground transition p-1 rounded"
                        title="View guide"
                      >
                        {isInfoOpen ? (
                          <X className="size-3.5" />
                        ) : (
                          <Info className="size-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Info panel with graphic */}
                  {isInfoOpen && ex.image && (
                    <div className="px-3 pb-3">
                      <img
                        src={ex.image}
                        alt={`${ex.name} guide`}
                        className="w-full rounded-lg object-cover max-h-48"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span>{completedExercises.size} / {activeWorkout?.exercises.length} completed</span>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveWorkout(null)}>
              Cancel
            </Button>
            <Button onClick={handleFinish} disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Finish Workout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── WorkoutCard ─────────────────────────────────────────────────────────────
function WorkoutCard({ workout, icon, onStart }: any) {
  return (
    <Card className="flex flex-col overflow-hidden">
      {/* Preview image */}
      <div className="relative h-32 overflow-hidden bg-muted">
        <img
          src={workout.image}
          alt={workout.title}
          className="w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
      </div>
      <CardHeader className="pb-3 pt-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {icon}
          {workout.title}
        </CardTitle>
        <CardDescription>{workout.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <ul className="space-y-2 flex-1 mb-4">
          {workout.exercises.map((ex: any, idx: number) => (
            <li
              key={idx}
              className={`flex justify-between items-start text-sm border-b border-border/50 pb-1.5 last:border-0 last:pb-0 ${ex.isStretch ? "text-violet-400" : ""}`}
            >
              <span className="font-medium pr-2">
                {ex.isStretch && "🧘 "}
                {ex.name}
              </span>
              <span className="text-muted-foreground whitespace-nowrap text-right text-xs">
                {ex.sets}
              </span>
            </li>
          ))}
        </ul>
        <Button onClick={() => onStart(workout)} className="w-full">
          Start Workout
        </Button>
      </CardContent>
    </Card>
  );
}
