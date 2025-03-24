"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/react";
import Col from "../../components/Col";
import Row from "../../components/Row";

export function ContactsTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const { data, isLoading } = api.contact.getContacts.useQuery({
    page: currentPage,
    limit: 50,
  });

  // TODO: do something better to show loading state
  if (isLoading) {
    return <div>Loading contacts...</div>;
  }

  if (!data?.contacts.length) {
    return <div>No contacts found. Try uploading a CSV file.</div>;
  }

  return (
    <Col className="h-full">
      <Col className="flex-1 overflow-hidden rounded-md border border-neutral-700">
        <div className="h-full overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-zinc-950">
              <TableRow className="border-b border-neutral-700">
                <TableHead>Email</TableHead>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.contacts.map((contact) => (
                <TableRow
                  key={contact.id}
                  className="border-b border-neutral-700"
                >
                  <TableCell>{contact.email}</TableCell>
                  <TableCell>{contact.firstName ?? "-"}</TableCell>
                  <TableCell>{contact.lastName ?? "-"}</TableCell>
                  <TableCell>
                    {new Date(contact.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Col>

      <div className="mt-4 flex shrink-0 items-center justify-between px-2">
        <div className="text-sm text-neutral-400">
          Page {data.currentPage} of {data.totalPages}
        </div>
        <Row className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage((p) => Math.min(data.totalPages, p + 1))
            }
            disabled={currentPage === data.totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Row>
      </div>
    </Col>
  );
}
