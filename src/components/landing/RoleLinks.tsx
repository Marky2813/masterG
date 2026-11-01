import Link from "next/link";

// Under the main call to action: the two class roles. A teacher makes a class; a student joins one
// with the teacher's code. Practising without a class stays the yellow button above.
export default function RoleLinks() {
  const cls =
    "inline-flex items-center gap-2 rounded-control border-[2.5px] border-kohl bg-paper px-4 py-2.5 font-display text-[15px] font-black shadow-hard-sm transition-[transform,box-shadow] hover:bg-white active:translate-x-1 active:translate-y-1 active:shadow-none";
  return (
    <div className="flex w-full flex-wrap gap-3">
      <Link href="/teacher" className={cls}>
        <span aria-hidden="true">🧑‍🏫</span> I&apos;m a teacher
      </Link>
      <Link href="/join" className={cls}>
        <span aria-hidden="true">🎒</span> Join my class
      </Link>
    </div>
  );
}
