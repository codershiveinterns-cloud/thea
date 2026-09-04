import type { Metadata } from "next";
import { AuthorForm } from "@/components/admin/authors/author-form";
import { LinkButton } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "New author" };

export default function NewAuthorPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="New author"
        description="Profiles are public: the name, avatar and bio appear on every post and on /author/[slug]."
        actions={
          <LinkButton href="/admin/authors" intent="secondary">
            Back to authors
          </LinkButton>
        }
      />
      <Card>
        <AuthorForm />
      </Card>
    </div>
  );
}
