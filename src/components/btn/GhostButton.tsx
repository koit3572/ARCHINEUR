"use client";

import * as React from "react";
import Button, { type ButtonProps } from "./Button";

export default function GhostButton(props: ButtonProps) {
  return <Button variant="ghost" {...props} />;
}
