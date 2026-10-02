/* Reading options: colour scheme and body typeface, both persisted.
   Built entirely in JS, so with scripting off nothing is rendered and there is
   no dead control — the defaults are fully readable and the site is complete
   without this file. See PRD RO-1..RO-7 and TH-1..TH-5.

   Each option is one control that cycles through its states, rather than a row
   of buttons per option: five pills competed with the author's name, which is
   the one thing in the header that should carry weight.

   These are <button>s styled as links. They perform an action rather than
   navigating, so an <a> with no real href would be the wrong element and would
   read as a broken link to a screen reader.

   Both preferences are applied before first paint by the inline script in
   <head>; this file only builds the controls and keeps them in sync. */

(function () {
  "use strict";

  var host = document.getElementById("reading-options");
  if (!host) return;

  var GROUPS = [
    {
      key: "wss-theme",
      attr: "theme",
      label: "Theme",
      fallback: "auto",
      options: [
        { value: "auto", label: "Auto", hint: "following your system setting" },
        { value: "light", label: "Light", hint: "always light" },
        { value: "dark", label: "Dark", hint: "always dark" }
      ]
    },
    {
      key: "wss-font",
      attr: "font",
      label: "Font",
      fallback: "sans",
      options: [
        { value: "sans", label: "Sans", hint: "Atkinson Hyperlegible, drawn for legibility" },
        { value: "serif", label: "Serif", hint: "Literata, drawn for long-form reading" }
      ]
    }
  ];

  var status = document.createElement("p");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.style.cssText =
    "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);" +
    "clip-path:inset(50%);white-space:nowrap";

  GROUPS.forEach(function (group) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "ro-toggle";

    function indexOf(value) {
      for (var i = 0; i < group.options.length; i++) {
        if (group.options[i].value === value) return i;
      }
      return 0;
    }

    function current() {
      try {
        var v = localStorage.getItem(group.key);
        return indexOf(v) >= 0 && group.options[indexOf(v)].value === v ? v : group.fallback;
      } catch (e) {
        return document.documentElement.dataset[group.attr] || group.fallback;
      }
    }

    function apply(value, announce) {
      var opt = group.options[indexOf(value)];
      if (value === group.fallback) {
        delete document.documentElement.dataset[group.attr];
      } else {
        document.documentElement.dataset[group.attr] = value;
      }
      try {
        localStorage.setItem(group.key, value);
      } catch (e) {
        /* Private mode or storage disabled — the choice still applies to this
           page, it just will not survive navigation. Degrade, do not break. */
      }

      var next = group.options[(indexOf(value) + 1) % group.options.length];
      button.innerHTML = "";
      button.appendChild(document.createTextNode(group.label + ": "));
      var strong = document.createElement("span");
      strong.className = "ro-value";
      strong.textContent = opt.label;
      button.appendChild(strong);

      button.setAttribute(
        "aria-label",
        group.label + " is " + opt.label + ", " + opt.hint + ". Change to " + next.label + "."
      );
      button.title = group.label + ": " + opt.label + " — " + opt.hint;

      if (announce) {
        status.textContent = group.label + " set to " + opt.label + ".";
      }
    }

    button.addEventListener("click", function () {
      var next = group.options[(indexOf(current()) + 1) % group.options.length];
      apply(next.value, true);
    });

    host.appendChild(button);
    apply(current(), false);
  });

  host.appendChild(status);

  /* Print this piece. Added here rather than in the template because
     window.print() requires JS — a button that does nothing with scripting off
     is worse than no button. Sits with the piece's own metadata, not floating. */
  var meta = document.body.classList.contains("printall")
    ? null
    : document.querySelector(".piece-head .meta");
  if (meta) {
    var title = document.querySelector(".piece-head h1");
    var print = document.createElement("button");
    print.type = "button";
    print.className = "print-piece";
    print.textContent = "· Print";
    print.setAttribute(
      "aria-label",
      "Print " + (title ? title.textContent : "this piece")
    );
    print.addEventListener("click", function () { window.print(); });
    meta.appendChild(print);
  }
})();
