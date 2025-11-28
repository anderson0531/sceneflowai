"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"

export default function DiagnosticsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const runDiagnostics = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/diagnostic/vertexai", { cache: "no-store" })
      const text = await res.text()
      let json: any = null
      try {
        json = JSON.parse(text)
      } catch {
        // Fallback: sometimes middleware/pages render 404 HTML
        throw new Error(text || `Unexpected response: ${res.status}`)
      }
      if (!res.ok) {
        throw new Error(json?.error || json?.message || `Status ${res.status}`)
      }
      setResult(json)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  const renderHintCommands = () => {
    const projectId = result?.projectId || "your-gcp-project-id"
    const saEmail = result?.serviceAccount || "service-account@your-gcp-project-id.iam.gserviceaccount.com"
    const region = result?.region || "us-central1"
    const bucket = "your-reference-images-bucket"

    const cmds = `export PROJECT_ID="${projectId}"
export SA_EMAIL="${saEmail}"
export REGION="${region}"
export BUCKET="${bucket}"

gcloud config set project "$PROJECT_ID"
gcloud services enable aiplatform.googleapis.com iamcredentials.googleapis.com

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/serviceusage.serviceUsageConsumer"

# If using GCS references (gcsUri)
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/storage.objectViewer"`

    return (
      <pre className="mt-4 p-3 rounded bg-muted text-xs overflow-auto whitespace-pre-wrap">
        {cmds}
      </pre>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Vertex AI Diagnostics</h1>
      <p className="text-sm text-muted-foreground">
        Run a live probe using the deployed credentials. This checks environment configuration and IAM permissions for Imagen.
      </p>

      <div className="flex items-center gap-3">
        <Button onClick={runDiagnostics} disabled={loading}>
          {loading ? "Running…" : "Run Diagnostics"}
        </Button>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded border border-red-300 bg-red-50 text-red-800 text-sm">
          <div className="font-medium">Error</div>
          <div className="mt-1 whitespace-pre-wrap break-words">{error}</div>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded border bg-card">
              <div className="text-xs text-muted-foreground">Project ID</div>
              <div className="text-sm font-mono">{result.projectId || "(missing)"}</div>
            </div>
            <div className="p-3 rounded border bg-card">
              <div className="text-xs text-muted-foreground">Region</div>
              <div className="text-sm font-mono">{result.region || "us-central1"}</div>
            </div>
            <div className="p-3 rounded border bg-card">
              <div className="text-xs text-muted-foreground">Service Account</div>
              <div className="text-sm font-mono break-all">{result.serviceAccount || "(unknown)"}</div>
            </div>
          </div>

          <div className="p-3 rounded border bg-card">
            <div className="text-xs text-muted-foreground">Model Get</div>
            <div className="text-sm font-mono">
              {result.modelGet?.status} {result.modelGet?.ok ? "✅" : "❌"}
            </div>
            {result.modelGet?.error && (
              <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{result.modelGet.error}</div>
            )}
          </div>

          <div className="p-3 rounded border bg-card">
            <div className="text-xs text-muted-foreground">Predict Probe</div>
            <div className="text-sm font-mono">
              {result.predictProbe?.status} {result.predictProbe?.ok ? "✅" : "❌"}
            </div>
            {result.predictProbe?.error && (
              <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{result.predictProbe.error}</div>
            )}
          </div>

          {result.hints && result.hints.length > 0 && (
            <div className="p-3 rounded border bg-card">
              <div className="text-sm font-medium">Hints</div>
              <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                {result.hints.map((h: string, idx: number) => (
                  <li key={idx}>{h}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="text-sm font-medium">Suggested GCP commands</div>
            {renderHintCommands()}
          </div>

          <div className="p-3 rounded border bg-card">
            <div className="text-sm font-medium">Raw Output</div>
            <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
