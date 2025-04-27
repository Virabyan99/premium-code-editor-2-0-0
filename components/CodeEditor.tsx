"use client";

import { useRef, useEffect } from "react";
import { EditorView, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { EditorState, Annotation } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { bracketMatching, indentUnit } from "@codemirror/language";
import { linter, lintGutter } from "@codemirror/lint";
import { keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"; // Add history and historyKeymap
import { fadeInExtension, addFadeIn } from "@/lib/fadeInExtension";

const ExternalUpdate = Annotation.define<boolean>();

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const todoLinter = linter((view) => {
    const diagnostics = [];
    const lines = view.state.doc.toString().split("\n");
    lines.forEach((line, index) => {
      if (line.includes("// TODO:")) {
        diagnostics.push({
          from: view.state.doc.line(index + 1).from,
          to: view.state.doc.line(index + 1).to,
          severity: "warning",
          message: "TODO comment found",
        });
      }
    });
    return diagnostics;
  });

  useEffect(() => {
    if (editorRef.current && !viewRef.current) {
      const editorTheme = EditorView.theme({
        "&": {
          fontFamily: "var(--font-mono), monospace",
          fontFeatureSettings: '"liga" 1',
          spellCheck: "false",
          "-webkit-font-smoothing": "antialiased",
        },
      });

      const state = EditorState.create({
        doc: value,
        extensions: [
          editorTheme,
          lineNumbers(),
          highlightActiveLine(),
          javascript(),
          bracketMatching(),
          indentUnit.of("  "),
          lintGutter(),
          todoLinter,
          history(), // Add history extension
          keymap.of([...defaultKeymap, ...historyKeymap]), // Combine defaultKeymap with historyKeymap
          EditorView.lineWrapping,
          fadeInExtension,
          EditorView.updateListener.of((update) => {
            if (
              update.docChanged &&
              !update.transactions.some((tr) => tr.annotation(ExternalUpdate))
            ) {
              onChange(update.state.doc.toString());
            }
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const changes = [];
              update.changes.iterChanges((fromA, toA, fromB, toB) => {
                if (fromB !== toB) {
                  changes.push({ from: fromB, to: toB });
                }
              });
              if (changes.length > 0) {
                update.view.dispatch({
                  effects: changes.map((change) => addFadeIn.of(change)),
                });
              }
            }
          }),
        ],
      });

      const view = new EditorView({
        state,
        parent: editorRef.current,
      });

      viewRef.current = view;
      view.focus();
      console.log("Editor focused on mount:", view.hasFocus);

      return () => {
        view.destroy();
      };
    }
  }, [onChange]);

  useEffect(() => {
    if (viewRef.current) {
      const currentCode = viewRef.current.state.doc.toString();
      if (currentCode !== value) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentCode.length, insert: value },
          annotations: ExternalUpdate.of(true),
        });
      }
    }
  }, [value]);

  const handleClick = () => {
    if (viewRef.current && !viewRef.current.hasFocus) {
      viewRef.current.focus();
    }
  };

  return (
    <div onClick={handleClick}>
      <div ref={editorRef} className="h-[88vh]" />
    </div>
  );
};

export default CodeEditor;