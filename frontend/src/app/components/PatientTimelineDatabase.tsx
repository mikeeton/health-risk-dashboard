import { useEffect, useState } from "react";
import { Clock, Plus } from "lucide-react";
import { createPatientEvent, getPatientEvents } from "../services/api";

type PatientEvent = {
  id: number;
  patient_id: number;
  event_type: string;
  title: string;
  description?: string | null;
  timestamp: string;
};

type Props = {
  patientId: number;
  canAddEvent?: boolean;
  defaultEventType?: string;
  defaultTitle?: string;
};

export default function PatientTimelineDatabase({
  patientId,
  canAddEvent = true,
  defaultEventType = "Clinical Note",
  defaultTitle = "Clinician note added",
}: Props) {
  const [events, setEvents] = useState<PatientEvent[]>([]);
  const [title, setTitle] = useState(defaultTitle);
  const [eventType, setEventType] = useState(defaultEventType);

  const loadEvents = async () => {
    try {
      const data = await getPatientEvents(patientId);
      setEvents(data);
    } catch (error) {
      console.error("Failed to load events:", error);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [patientId]);

  const addEvent = async () => {
    await createPatientEvent({
      patient_id: patientId,
      event_type: eventType,
      title,
      description: "Timeline event created from dashboard.",
      timestamp: new Date().toISOString(),
    });

    await loadEvents();
  };

  return (
    <section className="glass-card rounded-3xl p-6">
      <div className="mb-5 flex items-center gap-3">
        <Clock className="h-6 w-6 text-blue-600" />

        <div>
          <h2 className="text-xl font-bold">Patient Timeline</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Events saved in PostgreSQL
          </p>
        </div>
      </div>

      {canAddEvent && (
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <input
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"
          />

          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"
          />

          <button
            onClick={addEvent}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Event
          </button>
        </div>
      )}

      <div className="space-y-4">
        {events.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900">
            No timeline events yet.
          </p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="flex gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white">
                <Clock className="h-5 w-5" />
              </div>

              <div className="flex-1 rounded-2xl bg-white/70 p-4 dark:bg-slate-900/70">
                <p className="font-bold">{event.title}</p>
                <p className="text-sm text-slate-500">{event.event_type}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {event.description}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(event.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
