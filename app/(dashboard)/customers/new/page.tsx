import Link from "next/link";
import { ArrowLeft, UserRoundPlus } from "lucide-react";

import { CustomerForm } from "@/components/customers/customer-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/customers" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft className="size-4" /> Customers
      </Link>
      <div className="flex items-start gap-4">
        <span className="hidden size-12 shrink-0 place-items-center rounded-2xl bg-[#edf4ed] text-[#4c7959] sm:grid"><UserRoundPlus className="size-5" /></span>
        <div>
          <p className="eyebrow mb-2">CUSTOMER DIRECTORY</p>
          <h1 className="page-heading">Add a customer</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Save the right contact details once, then attach them to quotes whenever you need.
          </p>
        </div>
      </div>
      <Card className="gap-0">
        <CardHeader className="border-b border-border/70 pb-4">
          <CardTitle>Contact details</CardTitle>
          <CardDescription className="mt-1">Email is used for follow-up only when a quote is set up for it.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <CustomerForm />
        </CardContent>
      </Card>
    </div>
  );
}
