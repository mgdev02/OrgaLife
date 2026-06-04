import { Building2, Calendar, Clock } from "lucide-react";
import { clampPaymentDeadlineDay } from "../../lib/rentUtils";

interface Props {
  title: string;
  contractStart?: string;
  paymentDeadlineDay: number;
}

export default function RentHeader({
  title,
  contractStart,
  paymentDeadlineDay,
}: Props) {
  const deadline = clampPaymentDeadlineDay(paymentDeadlineDay);

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
      <Building2 className="h-4 w-4 shrink-0 text-neutral-500" />
      <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400">
        {title}
      </h2>
      <span className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-0.5 text-[10px] text-neutral-500">
        <Clock className="h-3 w-3 shrink-0 text-neutral-600" />
        Vencimiento: día {deadline} de cada mes
      </span>
      {contractStart && (
        <span className="ml-auto flex items-center gap-1.5 text-xs text-neutral-600">
          <Calendar className="h-3.5 w-3.5" />
          Desde{" "}
          {new Date(contractStart + "T12:00:00").toLocaleDateString("es-AR")}
        </span>
      )}
    </div>
  );
}
