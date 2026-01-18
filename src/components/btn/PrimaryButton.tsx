"use client";

import * as React from "react";
import Button, { type ButtonProps } from "./Button";

export default function PrimaryButton(props: ButtonProps) {
  return <Button variant="primary" {...props} />;
}
