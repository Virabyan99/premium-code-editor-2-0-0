"use client"

import { useRef, useEffect } from 'react'
import { EditorView, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { bracketMatching, indentUnit } from '@codemirror/language'
import { linter, lintGutter } from '@codemirror/lint'
import { keymap } from '@codemirror/view'
import { defaultKeymap } from '@codemirror/commands'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  // Custom linter for // TODO: comments
  const todoLinter = linter((view) => {
    const diagnostics = []
    const lines = view.state.doc.toString().split('\n')
    lines.forEach((line, index) => {
      if (line.includes('// TODO:')) {
        diagnostics.push({
          from: view.state.doc.line(index + 1).from,
          to: view.state.doc.line(index + 1).to,
          severity: 'warning',
          message: 'TODO comment found',
        })
      }
    })
    return diagnostics
  })

  // Initialize the editor on mount
  useEffect(() => {
    if (editorRef.current && !viewRef.current) {
      const state = EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          javascript(),
          bracketMatching(),
          indentUnit.of('  '),
          lintGutter(),
          todoLinter,
          keymap.of(defaultKeymap), // Adds default keybindings, including Enter
          EditorView.lineWrapping, // Enables line wrapping to prevent overflow
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChange(update.state.doc.toString())
            }
          }),
        ],
      })

      const view = new EditorView({
        state,
        parent: editorRef.current,
      })

      viewRef.current = view

      return () => {
        view.destroy()
      }
    }
  }, [onChange])

  // Sync editor content with value prop changes
  useEffect(() => {
    if (viewRef.current) {
      const currentCode = viewRef.current.state.doc.toString()
      if (currentCode !== value) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentCode.length, insert: value }
        })
      }
    }
  }, [value])

  return <div ref={editorRef} className="h-full" />
}

export default CodeEditor