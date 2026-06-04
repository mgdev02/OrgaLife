interface IconProps {
  className?: string;
  title?: string;
}

const DRIVE_SRC = "./icons/google-drive.svg";
const CALENDAR_SRC = "./icons/google-calendar.svg";

/** Icono oficial Google Drive (2020), Wikimedia Commons / Google LLC. */
export function GoogleDriveIcon({
  className = "h-4 w-4 shrink-0 object-contain",
  title = "Google Drive",
}: IconProps) {
  return (
    <img
      src={DRIVE_SRC}
      alt={title}
      title={title}
      draggable={false}
      className={className}
    />
  );
}

/** Icono oficial Google Calendar (2020), Wikimedia Commons / Google LLC. */
export function GoogleCalendarIcon({
  className = "h-4 w-4 shrink-0 object-contain",
  title = "Google Calendar",
}: IconProps) {
  return (
    <img
      src={CALENDAR_SRC}
      alt={title}
      title={title}
      draggable={false}
      className={className}
    />
  );
}
