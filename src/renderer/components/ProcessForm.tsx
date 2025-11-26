import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'

export interface ProcessFormValues {
  command: string
  args: string
  beforeStop: string
  afterStop: string
}

interface ProcessFormProps {
  initialValues?: Partial<ProcessFormValues>
  submitLabel?: string
  onSubmit: (values: ProcessFormValues) => Promise<void> | void
  onCancel?: () => void
  onChange?: (values: ProcessFormValues) => void
  className?: string
  submitButtonClassName?: string
  resetOnSubmit?: boolean
}

const DEFAULT_VALUES: ProcessFormValues = {
  command: '',
  args: '',
  beforeStop: '',
  afterStop: '',
}

const sanitizeValues = (values: ProcessFormValues): ProcessFormValues => ({
  command: values.command.trim(),
  args: values.args.trim(),
  beforeStop: values.beforeStop.trim(),
  afterStop: values.afterStop.trim(),
})

export function ProcessForm ({
  initialValues,
  submitLabel = 'Save',
  onSubmit,
  onCancel,
  onChange,
  className = '',
  submitButtonClassName = 'bg-emerald-600',
  resetOnSubmit = false,
}: ProcessFormProps) {
  const mergedInitialValues = useMemo(
    () => ({
      ...DEFAULT_VALUES,
      ...initialValues,
    }),
    [
      initialValues?.command,
      initialValues?.args,
      initialValues?.beforeStop,
      initialValues?.afterStop,
    ],
  )

  const [values, setValues] = useState<ProcessFormValues>(mergedInitialValues)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setValues(mergedInitialValues)
  }, [mergedInitialValues])

  const handleChange = (key: keyof ProcessFormValues) => (event: ChangeEvent<HTMLInputElement>) => {
    const nextValues = { ...values, [key]: event.target.value }
    setValues(nextValues)
    onChange?.(nextValues)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = sanitizeValues(values)
    if (!trimmed.command) return

    try {
      setSubmitting(true)
      await onSubmit(trimmed)
      if (resetOnSubmit) {
        setValues(DEFAULT_VALUES)
        onChange?.(DEFAULT_VALUES)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-4 ${className}`}>
      <div className="flex flex-col gap-3 md:flex-row">
        <input
          className="flex-1 px-3 py-2 rounded bg-slate-900"
          placeholder="Command"
          value={values.command}
          onChange={handleChange('command')}
        />
        <input
          className="flex-1 px-3 py-2 rounded bg-slate-900"
          placeholder="Args"
          value={values.args}
          onChange={handleChange('args')}
        />
      </div>
      <div className="flex flex-col gap-3 md:flex-row">
        <input
          className="flex-1 px-3 py-2 rounded bg-slate-900 text-sm"
          placeholder="Before Stop Hook (optional)"
          value={values.beforeStop}
          onChange={handleChange('beforeStop')}
        />
        <input
          className="flex-1 px-3 py-2 rounded bg-slate-900 text-sm"
          placeholder="After Stop Hook (optional)"
          value={values.afterStop}
          onChange={handleChange('afterStop')}
        />
      </div>
      <div className="flex gap-3 justify-end flex-wrap">
        {onCancel && (
          <button
            type="button"
            className="px-4 py-2 bg-slate-600 rounded"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className={`px-4 py-2 rounded ${submitButtonClassName}`}
          disabled={submitting || !values.command.trim()}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

export default ProcessForm
