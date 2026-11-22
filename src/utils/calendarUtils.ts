const formatUtcIcsDate = (date: Date): string => {
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return safeDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
};

const escapeIcsText = (text: string): string =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

export const generateGoogleCalendarUrl = (event: {
  title: string;
  description: string;
  location: string;
  startTime: Date;
  endTime: Date;
}) => {
  const baseUrl = "https://calendar.google.com/calendar/render";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatUtcIcsDate(event.startTime)}/${formatUtcIcsDate(event.endTime)}`,
    details: event.description,
    location: event.location,
    sf: "true",
    output: "xml",
  });
  return `${baseUrl}?${params.toString()}`;
};

export const downloadICS = (event: {
  title: string;
  description: string;
  location: string;
  startTime: Date;
  endTime: Date;
}) => {
  const host =
    typeof window !== "undefined" ? window.location.hostname : "wedding.local";

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Digital Wedding Management//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART:${formatUtcIcsDate(event.startTime)}`,
    `DTEND:${formatUtcIcsDate(event.endTime)}`,
    `DTSTAMP:${formatUtcIcsDate(new Date())}`,
    `UID:${Date.now()}-${Math.random().toString(36).slice(2, 8)}@${host}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `LOCATION:${escapeIcsText(event.location)}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    `${event.title.replace(/[^a-zA-Z0-9_-]+/g, "_")}.ics`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
