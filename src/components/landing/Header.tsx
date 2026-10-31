import { Wordmark } from "./Brand";

export default function Header() {
  return (
    <header className="mx-auto flex w-full max-w-[1360px] items-center px-4 pt-5 md:px-10 md:pt-6">
      <Wordmark />
    </header>
  );
}
