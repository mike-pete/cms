"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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
  const { data: freshData, isLoading } = api.contact.getContacts.useQuery({
    page: currentPage,
    limit: 50,
  });
  const [data, setData] = useState(freshData);

  useEffect(() => {
    if (freshData) {
      setData(freshData);
    }
  }, [freshData]);

  if (!data?.contacts.length) {
    return (
      <Col className="flex-1 items-center justify-center rounded-md border border-neutral-700 p-4">
        <p className="text-center text-xl text-neutral-200">
          No contacts found.
          <br />
          Upload a CSV file to get started.
        </p>
      </Col>
    );
  }

  return (
    <Col className="h-full">
      <Col className="flex-1 overflow-hidden rounded-md border border-neutral-700">
        <Col className="relative h-full overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-zinc-950">
              <TableRow className="border-b border-neutral-700">
                <TableHead>email</TableHead>
                <TableHead>first name</TableHead>
                <TableHead>last name</TableHead>
                <TableHead>created on</TableHead>
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
          {isLoading && (
            <Row className="sticky bottom-0 right-0 flex-1 items-center justify-end p-4">
              <Row className="items-center gap-2 rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2">
                <p className="text-lg font-medium">loading</p>
                <Loader2 className="h-4 w-4 animate-spin" />
              </Row>
            </Row>
          )}
        </Col>
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
