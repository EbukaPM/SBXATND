import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CorrectionForm } from "./CorrectionForm";

export const dynamic = "force-dynamic";

export default async function AttendanceCorrectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await prisma.attendanceRecord.findUnique({
    where: { id },
    include: { employee: true, office: true, corrections: { include: { changedBy: true }, orderBy: { changedAt: "desc" } } },
  });
  if (!record) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {record.employee.firstName} {record.employee.lastName} — {record.attendanceDate.toISOString().slice(0, 10)}
        </h1>
        <p className="text-sm text-muted-foreground">{record.office.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Correct record</CardTitle>
        </CardHeader>
        <CardContent>
          <CorrectionForm record={record} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Correction history</CardTitle>
        </CardHeader>
        <CardContent>
          {record.corrections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No corrections yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {record.corrections.map((c) => (
                <li key={c.id} className="border-b pb-2 last:border-0">
                  <p>
                    <strong>{c.field}</strong>: {c.originalValue ?? "—"} → {c.newValue ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.changedBy.fullName} · {c.changedAt.toLocaleString()} · {c.reason}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
