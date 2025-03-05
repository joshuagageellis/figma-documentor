import React from "react";
import { cva, VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "duration-300 cursor-pointer text-md disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
  {
    variants: {
      type: {
        default: "bg-transparent font-semibold underline p-0 hover:opacity-70",
        plus: "bg-transparent font-semibold p-0 hover:opacity-70",
        minus: "bg-transparent font-semibold p-0 hover:opacity-70",
      },
      color: {
        default: "text-black",
        warn: "text-warn",
      },
    },
    defaultVariants: {
      type: "default",
      color: "default",
    },
  },
);

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  href?: string;
  target?: string;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>;
}

const Button: React.FC<ButtonProps> = ({
  children,
  href,
  target,
  onClick,
  type,
  disabled,
  color,
}) => {
  if (href) {
    return (
      <a
        className={buttonVariants({ type, color })}
        href={href}
        target={target}
        onClick={onClick}
      >
        <span>{children}</span>
        {type === "plus" && (
          <span className="font-semibold text-lg ml-2">+</span>
        )}
        {type === "minus" && (
          <span className="font-semibold text-lg ml-2">-</span>
        )}
      </a>
    );
  }

  return (
    <button
      className={buttonVariants({ type, color })}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{children}</span>
      {type === "plus" && <span className="font-semibold text-lg ml-2">+</span>}
      {type === "minus" && (
        <span className="font-semibold text-lg ml-2">-</span>
      )}
    </button>
  );
};

export default Button;
