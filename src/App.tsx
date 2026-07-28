import { lazy, Suspense } from "react";
import { HashRouter, Routes, Route } from "react-router";
import { AppLayout } from "./components/layout/AppLayout";
import { ThemeProvider } from "./hooks/useTheme";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { RouteLoader } from "./components/ui/RouteLoader";
import { PwaUpdatePrompt } from "./components/pwa/PwaUpdatePrompt";

const DashboardView = lazy(() => import("./features/dashboard/DashboardView").then(m => ({ default: m.DashboardView })));
const ProfileView = lazy(() => import("./features/profile/ProfileView").then(m => ({ default: m.ProfileView })));
const ClassesView = lazy(() => import("./features/classes/ClassesView").then(m => ({ default: m.ClassesView })));
const ClassDetailView = lazy(() => import("./features/classes/ClassDetailView").then(m => ({ default: m.ClassDetailView })));
const AttendanceView = lazy(() => import("./features/attendance/AttendanceView").then(m => ({ default: m.AttendanceView })));
const GradebookView = lazy(() => import("./features/grades/GradebookView").then(m => ({ default: m.GradebookView })));
const MaterialsView = lazy(() => import("./features/notes/MaterialsView").then(m => ({ default: m.MaterialsView })));
const PresentationView = lazy(() => import("./features/notes/PresentationView").then(m => ({ default: m.PresentationView })));
const MaterialReadView = lazy(() => import("./features/notes/MaterialReadView").then(m => ({ default: m.MaterialReadView })));
const MaterialEditView = lazy(() => import("./features/notes/MaterialEditView").then(m => ({ default: m.MaterialEditView })));
const JournalsView = lazy(() => import("./features/notes/JournalsView").then(m => ({ default: m.JournalsView })));
const EvaluationsView = lazy(() => import("./features/notes/EvaluationsView").then(m => ({ default: m.EvaluationsView })));
const QuizView = lazy(() => import("./features/notes/QuizView").then(m => ({ default: m.QuizView })));
const CalendarView = lazy(() => import("./features/calendar/CalendarView").then(m => ({ default: m.CalendarView })));
const SettingsView = lazy(() => import("./features/settings/SettingsView").then(m => ({ default: m.SettingsView })));
const SubjectsView = lazy(() => import("./features/subjects/SubjectsView").then(m => ({ default: m.SubjectsView })));
const StudentsView = lazy(() => import("./features/students/StudentsView").then(m => ({ default: m.StudentsView })));
const StudentDetailView = lazy(() => import("./features/students/StudentDetailView").then(m => ({ default: m.StudentDetailView })));
const AboutView = lazy(() => import("./features/about/AboutView").then(m => ({ default: m.AboutView })));

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="ais-theme">
      <HashRouter>
        <ErrorBoundary>
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardView />} />
                <Route path="/profile" element={<ProfileView />} />
                <Route path="/subjects" element={<SubjectsView />} />
                <Route path="/classes" element={<ClassesView />} />
                <Route path="/classes/:id" element={<ClassDetailView />} />
                <Route path="/students" element={<StudentsView />} />
                <Route path="/students/:id" element={<StudentDetailView />} />
                <Route path="/attendance" element={<AttendanceView />} />
                <Route path="/grades" element={<GradebookView />} />
                <Route path="/materials" element={<MaterialsView />} />
                <Route path="/journals" element={<JournalsView />} />
                <Route path="/evaluations" element={<EvaluationsView />} />
                <Route path="/calendar" element={<CalendarView />} />
                <Route path="/settings" element={<SettingsView />} />
                <Route path="/about" element={<AboutView />} />
              </Route>
              {/* Full-screen routes — rendered outside AppLayout */}
              <Route path="/evaluations/:id/quiz" element={<QuizView />} />
              <Route path="/materials/:id/present" element={<PresentationView />} />
              <Route path="/materials/new" element={<MaterialEditView />} />
              <Route path="/materials/:id/edit" element={<MaterialEditView />} />
              <Route path="/materials/:id/view" element={<MaterialReadView />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </HashRouter>
      <PwaUpdatePrompt />
    </ThemeProvider>
  );
}
