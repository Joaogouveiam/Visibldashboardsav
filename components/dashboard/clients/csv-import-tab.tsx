'use client'

import { useCallback, useRef, useState, useTransition } from 'react'
import Papa from 'papaparse'
import {
  UploadCloud, FileSpreadsheet, Loader2, AlertCircle,
  CheckCircle2, X, Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { importClientContexts, type ImportClientsResult } from '@/lib/supabase/actions'
import { validateClient, toClientInput, isKnownOffer } from '@/lib/clients/validation'
import { useToast } from '@/components/ui/toast'
import type { ClientContextInput } from '@/lib/types/sav'
import { OfferBadge } from './shared'

const EXPECTED_COLUMNS = ['full_name', 'email', 'phone', 'company', 'offer', 'context_summary'] as const

interface ParsedRow {
  line:    number
  input:   ClientContextInput
  error:   string | null
  /** Offre présente mais hors liste connue — importée telle quelle, signalée à l'écran. */
  offerWarning: boolean
}

/** Tolère les en-têtes « Full Name », « FULL_NAME », « full name »… */
function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s-]+/g, '_')
}

export function CsvImportTab({ onImported }: { onImported: () => void }) {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows]         = useState<ParsedRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [missingColumns, setMissingColumns] = useState<string[]>([])
  const [result, setResult]     = useState<ImportClientsResult | null>(null)
  const [isPending, startTransition] = useTransition()

  const validRows = rows.filter(r => r.error === null)

  const reset = useCallback(() => {
    setFileName(null)
    setRows([])
    setParseError(null)
    setMissingColumns([])
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  const parseFile = useCallback((file: File) => {
    setParseError(null)
    setResult(null)
    setMissingColumns([])
    setFileName(file.name)

    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
      setRows([])
      setParseError('Le fichier doit être au format CSV.')
      return
    }

    Papa.parse<Record<string, string>>(file, {
      header:          true,
      skipEmptyLines:  'greedy',
      transformHeader: normalizeHeader,
      complete: ({ data, meta, errors }) => {
        const headers = meta.fields ?? []

        if (!headers.includes('full_name')) {
          setRows([])
          setParseError(
            'Colonne « full_name » absente. Colonnes attendues : ' + EXPECTED_COLUMNS.join(', ') + '.'
          )
          return
        }

        setMissingColumns(EXPECTED_COLUMNS.filter(c => !headers.includes(c)))

        // Papaparse remonte les erreurs de structure par index de ligne.
        const rowErrors = new Map<number, string>()
        for (const e of errors) {
          if (typeof e.row === 'number' && !rowErrors.has(e.row)) rowErrors.set(e.row, e.message)
        }

        const parsed: ParsedRow[] = data.map((raw, i) => {
          const input = toClientInput(raw)
          const structural = rowErrors.get(i)
          const validation = validateClient(input)

          return {
            line:  i + 2, // +1 pour l'en-tête, +1 pour un index humain
            input,
            error: structural ?? (Object.values(validation)[0] as string | undefined) ?? null,
            offerWarning: input.offer !== null && !isKnownOffer(input.offer),
          }
        })

        if (parsed.length === 0) {
          setRows([])
          setParseError('Le fichier ne contient aucune ligne de données.')
          return
        }

        setRows(parsed)
      },
      error: err => {
        setRows([])
        setParseError(err.message)
      },
    })
  }, [])

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) parseFile(file)
  }

  function handleImport() {
    if (validRows.length === 0) return

    startTransition(async () => {
      const res = await importClientContexts(validRows.map(r => r.input))

      // Les lignes rejetées au parsing s'ajoutent aux rejets côté serveur.
      const clientSideFailed = rows.length - validRows.length
      const merged: ImportClientsResult = {
        ...res,
        failed: res.failed + clientSideFailed,
      }
      setResult(merged)

      const imported = merged.inserted + merged.updated
      onImported()

      toast({
        variant: merged.failed > 0 ? (imported > 0 ? 'info' : 'error') : 'success',
        title: `${imported} client${imported > 1 ? 's' : ''} importé${imported > 1 ? 's' : ''}, ${merged.failed} erreur${merged.failed > 1 ? 's' : ''}`,
        description: merged.updated > 0
          ? `${merged.inserted} création${merged.inserted > 1 ? 's' : ''}, ${merged.updated} mise${merged.updated > 1 ? 's' : ''} à jour`
          : undefined,
      })
    })
  }

  return (
    <div className="space-y-4">

      {/* Zone de dépôt */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        className={cn(
          'rounded-2xl border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
          dragging
            ? 'border-indigo-400 bg-indigo-50/70 dark:bg-indigo-900/20'
            : 'border-white/70 dark:border-white/10 bg-white/40 dark:bg-white/[0.04] hover:bg-white/60 dark:hover:bg-white/[0.07]'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) parseFile(file)
          }}
        />
        <div className={cn(
          'w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/25',
          dragging && 'scale-110 transition-transform'
        )}>
          <UploadCloud size={19} className="text-white" />
        </div>
        <p className="text-sm font-semibold text-foreground">
          {dragging ? 'Déposez le fichier ici' : 'Glissez un CSV ou cliquez pour parcourir'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Colonnes attendues : {EXPECTED_COLUMNS.join(', ')}
        </p>
      </div>

      {/* Fichier chargé */}
      {fileName && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/40 dark:bg-white/[0.04] border border-white/60 dark:border-white/10 rounded-xl px-3 py-2">
          <FileSpreadsheet size={13} className="text-indigo-500 shrink-0" />
          <span className="font-medium text-foreground truncate">{fileName}</span>
          {rows.length > 0 && (
            <span className="shrink-0">— {rows.length} ligne{rows.length > 1 ? 's' : ''}</span>
          )}
          <button
            onClick={reset}
            aria-label="Retirer le fichier"
            className="ml-auto shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {parseError && (
        <div className="rounded-xl px-3 py-2.5 flex items-start gap-2 bg-red-50/80 dark:bg-red-900/20 border border-red-200/60 dark:border-red-800/40">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-300">{parseError}</p>
        </div>
      )}

      {missingColumns.length > 0 && rows.length > 0 && (
        <div className="rounded-xl px-3 py-2.5 flex items-start gap-2 bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40">
          <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Colonne{missingColumns.length > 1 ? 's' : ''} absente{missingColumns.length > 1 ? 's' : ''} :{' '}
            <span className="font-mono font-semibold">{missingColumns.join(', ')}</span> — ces champs resteront vides.
          </p>
        </div>
      )}

      {/* Prévisualisation */}
      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{validRows.length}</span> ligne{validRows.length > 1 ? 's' : ''} valide{validRows.length > 1 ? 's' : ''}
              {rows.length - validRows.length > 0 && (
                <>
                  {' · '}
                  <span className="font-semibold text-red-600 dark:text-red-400">{rows.length - validRows.length}</span> invalide{rows.length - validRows.length > 1 ? 's' : ''}
                </>
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-white/60 dark:border-white/10 overflow-hidden">
            <div className="overflow-auto max-h-[300px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-white/70 dark:bg-[#191636] backdrop-blur border-b border-white/60 dark:border-white/10">
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-10">#</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Nom</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Email</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Téléphone</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Entreprise</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Offre</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr
                      key={row.line}
                      className={cn(
                        'border-b border-white/40 dark:border-white/[0.05] last:border-b-0',
                        row.error
                          ? 'bg-red-50/60 dark:bg-red-900/15'
                          : 'bg-white/20 dark:bg-white/[0.02]'
                      )}
                    >
                      <td className="px-3 py-2 text-muted-foreground/60 font-mono">{row.line}</td>
                      <td className="px-3 py-2 max-w-[160px]">
                        <span className="font-medium text-foreground truncate block">
                          {row.input.full_name ?? <span className="italic opacity-50">—</span>}
                        </span>
                        {row.error && (
                          <span className="text-[10px] text-red-600 dark:text-red-400 flex items-center gap-1 mt-0.5">
                            <AlertCircle size={9} className="shrink-0" />
                            {row.error}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground max-w-[170px] truncate">
                        {row.input.email ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {row.input.phone ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground max-w-[130px] truncate">
                        {row.input.company ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <OfferBadge offer={row.input.offer} />
                          {row.offerWarning && (
                            <span title="Offre hors liste — importée telle quelle">
                              <AlertCircle size={10} className="text-amber-500 shrink-0" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Résultat d'import */}
      {result && (
        <div className={cn(
          'rounded-xl px-3 py-2.5 space-y-2 border',
          result.failed > 0
            ? 'bg-amber-50/80 dark:bg-amber-900/20 border-amber-200/60 dark:border-amber-800/40'
            : 'bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-200/60 dark:border-emerald-800/40'
        )}>
          <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
            {result.failed > 0
              ? <AlertCircle size={13} className="text-amber-500 shrink-0" />
              : <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />}
            {result.inserted + result.updated} client{result.inserted + result.updated > 1 ? 's' : ''} importé{result.inserted + result.updated > 1 ? 's' : ''}, {result.failed} erreur{result.failed > 1 ? 's' : ''}
          </p>
          {(result.inserted > 0 || result.updated > 0) && (
            <p className="text-[11px] text-muted-foreground">
              {result.inserted} création{result.inserted > 1 ? 's' : ''} · {result.updated} mise{result.updated > 1 ? 's' : ''} à jour (doublon email ou téléphone)
            </p>
          )}
          {result.errors.length > 0 && (
            <ul className="space-y-0.5 max-h-24 overflow-y-auto">
              {result.errors.map((e, i) => (
                <li key={i} className="text-[11px] text-red-600 dark:text-red-400">
                  Ligne {e.row} {e.name ? `(${e.name})` : ''} — {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Action */}
      <div className="flex items-center justify-end gap-2 pt-1">
        {rows.length > 0 && (
          <button
            onClick={reset}
            disabled={isPending}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-white/50 dark:hover:bg-white/[0.06] disabled:opacity-60 transition-colors"
          >
            Réinitialiser
          </button>
        )}
        <button
          onClick={handleImport}
          disabled={isPending || validRows.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          Importer{validRows.length > 0 ? ` ${validRows.length} client${validRows.length > 1 ? 's' : ''}` : ''}
        </button>
      </div>
    </div>
  )
}
