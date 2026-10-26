"use client";

import { useEffect, useRef } from "react";
import type { Instance } from "flatpickr/dist/types/instance";
import "flatpickr/dist/flatpickr.min.css";
import styles from "./datePicker.module.scss";

type DatePickerProps = {
  id: string;
  name: string;
  // The chosen day as YYYY-MM-DD, or "" for none.
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const toIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

// Clicking the input opens a calendar styled to match the site. The visitor sees "December 6, 2026"; the form holds "2026-12-06".
export default function DatePicker({ id, name, value, onChange, placeholder = "Pick a date" }: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const picker = useRef<Instance | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  });

  useEffect(() => {
    let instance: Instance | undefined;
    let cancelled = false;
    void import("flatpickr").then(({ default: flatpickr }) => {
      if (cancelled || !inputRef.current) return;
      instance = flatpickr(inputRef.current, {
        dateFormat: "F j, Y",
        minDate: "today",
        disableMobile: true,
        monthSelectorType: "static",
        defaultDate: valueRef.current ? new Date(`${valueRef.current}T00:00:00`) : undefined,
        onChange: ([date]) => onChangeRef.current(date ? toIso(date) : ""),
        onReady: (_dates, _text, self) => {
          self.calendarContainer.classList.add(styles.calendar);
          const clear = document.createElement("button");
          clear.type = "button";
          clear.className = styles.clear;
          clear.textContent = "Clear date";
          clear.addEventListener("click", () => {
            self.clear();
            self.close();
          });
          self.calendarContainer.appendChild(clear);
        },
      });
      picker.current = instance;
    });
    return () => {
      cancelled = true;
      instance?.destroy();
      picker.current = null;
    };
  }, []);

  // Keeps the calendar in step when the form clears the value after a message is sent.
  useEffect(() => {
    picker.current?.setDate(value ? new Date(`${value}T00:00:00`) : [], false);
  }, [value]);

  return <input ref={inputRef} id={id} name={name} type="text" readOnly placeholder={placeholder} autoComplete="off" className={styles.input} />;
}
