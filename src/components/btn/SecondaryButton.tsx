"use client";

import * as React from "react";
import Button, { type ButtonProps } from "./Button";

export default function SecondaryButton(props: ButtonProps) {
  return <Button variant="secondary" {...props} />;
}
