import { useRef, useState } from 'react';
import { FileUp, FileText, Star, Download, Trash2 } from 'lucide-react';
import { useFetch } from '../../lib/hooks';
import { api, downloadFile } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ConfirmDialog } from '../../components/ui/dialog';
import { PageLoader, EmptyState, Alert } from '../../components/ui/misc';
import { useToast } from '../../components/ui/toast';
import { formatDate } from '../../lib/utils';

const MAX_MB = 5;
const ALLOWED = '.pdf, .doc, .docx';

export default function Resumes() {
  const toast = useToast();
  const fileInput = useRef(null);
  const { data, loading, refetch } = useFetch('/api/resumes');
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const resumes = data?.resumes || [];

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.upload('/api/resumes', formData);
      toast.success('Resume uploaded');
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const setDefault = async (resume) => {
    try {
      await api.patch(`/api/resumes/${resume.id}/default`);
      toast.success('Default resume updated');
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/api/resumes/${deleteTarget.id}`);
      toast.success('Resume deleted');
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toast.error(err.message);
      setDeleteTarget(null);
    }
  };

  if (loading) return <div className="page-container py-10"><PageLoader /></div>;

  return (
    <div className="page-container max-w-3xl py-8">
      <h1 className="text-2xl font-bold tracking-tight">Resumes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload up to 10 resumes ({ALLOWED}, max {MAX_MB} MB). Your default resume is pre-selected when you apply.
      </p>

      <Card className="mt-6">
        <CardContent className="p-8">
          <label
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50 hover:bg-secondary/40"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files?.[0]); }}
          >
            <FileUp className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">{uploading ? 'Uploading…' : 'Click to upload or drag & drop'}</p>
            <p className="text-xs text-muted-foreground">{ALLOWED} · max {MAX_MB} MB</p>
            <input
              ref={fileInput}
              type="file"
              className="sr-only"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => upload(e.target.files?.[0])}
              disabled={uploading}
            />
          </label>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {resumes.length === 0 ? (
          <EmptyState icon={FileText} title="No resumes yet" description="Upload your first resume above — PDF keeps formatting best." />
        ) : resumes.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary">
                  <FileText className="h-5 w-5 text-primary" />
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate font-medium">
                    {r.originalName}
                    {r.isDefault && <Badge variant="success"><Star className="mr-0.5 h-3 w-3" />Default</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded {formatDate(r.createdAt)} · {(r.sizeBytes / 1024 / 1024).toFixed(2)} MB
                    {r.usedByApplications > 0 && ` · used by ${r.usedByApplications} application${r.usedByApplications === 1 ? '' : 's'}`}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                {!r.isDefault && (
                  <Button variant="ghost" size="sm" onClick={() => setDefault(r)}><Star /> Make default</Button>
                )}
                <Button variant="ghost" size="icon" aria-label="Download" onClick={() => downloadFile(`/api/resumes/${r.id}/download`, r.originalName)}>
                  <Download />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setDeleteTarget(r)}>
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {resumes.some((r) => r.usedByApplications > 0) && (
        <Alert variant="info" className="mt-4">
          Resumes attached to applications cannot be deleted — upload a new one instead. This keeps the recruiter's view of your application intact.
        </Alert>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        title="Delete resume?"
        message={`"${deleteTarget?.originalName}" will be permanently removed.`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
