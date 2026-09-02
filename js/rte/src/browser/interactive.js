// A link or a button around an editing host — `<a><span contenteditable>` — is a
// host shape engines answer with the element instead of the text: the link is
// dragged rather than giving the text a caret, and followed when the press ends.
// Both belong to what surrounds the text, not to someone editing it.
//
// Only what surrounds the host is asked for: a link the content itself holds is
// content, and what a press does to that one is the editor's own business.
export function interactiveAround(host) {
    return host?.closest('a[href], button') || null;
}

// And a button answers Space and Enter by activating itself, whatever it holds:
// the text inside never sees those keys, and no `beforeinput` arrives at all.
export function activatingAround(host) {
    return host?.closest('button') || null;
}
