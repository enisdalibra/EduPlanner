import { Suspense } from "react";
import { HashRouter, Routes, Route } from "react-router";
import { AppLayout } from "./components/layout/AppLayout";
import { ThemeProvider } from "./hooks/useTheme";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { RouteLoader } from "./components/ui/RouteLoader";
import { PwaUpdatePrompt } from "./components/pwa/PwaUpdatePrompt";
import {
  AboutView,
  AttendanceView,
  CalendarView,
  ClassDetailView,
  ClassesView,
  DashboardView,
  EvaluationsView,
  GradebookView,
  JournalsView,
  MaterialEditView,
  MaterialReadView,
  MaterialsView,
  PresentationView,
  ProfileView,
  QuizView,
  SettingsView,
  StudentDetailView,
  StudentsView,
  SubjectsView,
  TeachingLogsView,
} from "./routes/lazyRoutes";

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
                <Route path="/teaching-logs" element={<TeachingLogsView />} />
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
