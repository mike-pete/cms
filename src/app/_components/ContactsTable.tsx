"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { api } from "~/trpc/react";

export function ContactsTable() {
  const { data: contacts, isLoading } = api.contact.getContacts.useQuery();

  if (isLoading) {
    return <div>Loading contacts...</div>;
  }

  if (!contacts?.length) {
    return <div>No contacts found. Try uploading a CSV file.</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>First Name</TableHead>
            <TableHead>Last Name</TableHead>
            <TableHead>Created At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id}>
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
  );
}
