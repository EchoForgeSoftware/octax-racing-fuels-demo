const publicLinks = [
  { href: "/shop/", label: "Shop" },
  { href: "/information/", label: "Info" },
  { href: "/agents/", label: "Agents" },
  { href: "/contact/", label: "Contact" },
];

export function navigationLinks(signedIn: boolean) {
  return signedIn
    ? [...publicLinks.slice(0, 3), { href: "/account/", label: "Customer" }, ...publicLinks.slice(3)]
    : publicLinks;
}
