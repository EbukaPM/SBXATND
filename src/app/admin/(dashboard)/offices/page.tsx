import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateNetworkForm, NetworkRow } from "./NetworkAgentPanel";
import { CreateOfficeForm } from "./CreateOfficeForm";
import { PageHeader } from "@/components/admin/PageHeader";

export const dynamic = "force-dynamic";

export default async function OfficesPage() {
  const offices = await prisma.office.findMany({
    include: { officeNetworks: true, _count: { select: { employees: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <PageHeader>
        <h1 className="text-2xl font-bold">Offices &amp; Network</h1>
        <p className="text-sm text-muted-foreground">
          Each office needs at least one verified network for network-based attendance checks to pass. Two ways to
          verify: run the Python Network Agent on an always-on office machine (auto-updates every few minutes — see
          docs/OFFICE_NETWORK_AGENT_SETUP.md), or, if you don&apos;t have one, click{" "}
          <strong>Authorize This Network Now</strong> below while connected to office Wi-Fi — no dedicated machine
          needed, just re-click it whenever Starlink&apos;s IP changes.
        </p>
      </PageHeader>
      <div className="space-y-6 px-4 py-6 sm:px-6 md:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Add office</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateOfficeForm />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {offices.map((office) => (
          <Card key={office.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  {office.name}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    · {office._count.employees} employees · {office.timezone}
                  </span>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {office.officeNetworks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No network registered yet.</p>
              ) : (
                <div className="space-y-2">
                  {office.officeNetworks.map((n) => (
                    <NetworkRow key={n.id} network={n} />
                  ))}
                </div>
              )}
              <CreateNetworkForm officeId={office.id} />
            </CardContent>
          </Card>
        ))}
        {offices.length === 0 ? <p className="text-sm text-muted-foreground">No offices yet.</p> : null}
      </div>
      </div>
    </>
  );
}
