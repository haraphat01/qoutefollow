import Link from "next/link";
import { ArrowRight, Mail, Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listCustomers } from "@/lib/queries/customers";
import { getSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

export default async function CustomersPage() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const rows = await listCustomers(session.organization.id);

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow mb-2">THE PEOPLE BEHIND THE PROJECTS</p>
          <h1 className="page-heading">Customers</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Keep contact details close to the quotes and jobs they belong to.
          </p>
        </div>
        <Button asChild size="lg" className="h-11 gap-2 self-start rounded-xl px-4 sm:self-auto">
          <Link href="/customers/new"><Plus className="size-4" /> Add customer</Link>
        </Button>
      </div>

      <Card className="gap-0">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle>Customer directory</CardTitle>
            <CardDescription className="mt-1.5">Contact details saved in your workspace.</CardDescription>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {rows.length} {rows.length === 1 ? "customer" : "customers"}
          </span>
        </CardHeader>
        <CardContent className="pt-0">
          {rows.length === 0 ? (
            <div className="empty-state min-h-72">
              <span className="empty-state-icon"><Users className="size-5" /></span>
              <h3 className="mt-4 text-sm font-semibold">Start your customer directory</h3>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Add a customer here or create a quote and enter their details as you go.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button asChild><Link href="/customers/new">Add customer <ArrowRight className="size-4" /></Link></Button>
                <Button asChild variant="outline"><Link href="/quotes/new">Create a quote</Link></Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email address</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Last updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#edf4ed] text-xs font-bold text-[#4c7959]">
                          {customer.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                        <Link href={`/customers/${customer.id}`} className="font-semibold hover:text-primary">{customer.name}</Link>
                      </div>
                    </TableCell>
                    <TableCell><a className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary" href={`mailto:${customer.email}`}><Mail className="size-3.5" />{customer.email}</a></TableCell>
                    <TableCell className="text-muted-foreground">{customer.phone ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(customer.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
