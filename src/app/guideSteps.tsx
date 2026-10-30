import type { ReactNode } from 'react'
import { run, type Machine } from '../core/machine'

export interface GuideStep {
  title: string
  /** `data-guide` value of the element to highlight. */
  target?: string
  body: ReactNode
  /** Applied when the step is entered; all previous steps are replayed first. */
  apply?: (m: Machine) => Machine
}

const k = (s: string) => <code className="rounded bg-code px-1 font-mono">{s}</code>

export const GUIDE_STEPS: GuideStep[] = [
  {
    title: 'Willkommen bei CPU-Direkt',
    body: (
      <>
        <p>CPU-Direkt simuliert einen stark vereinfachten Mikroprozessor (CPU) mit einem Speicher aus 256 Zellen à 16 Bit.</p>
        <p>Die Maschine ist <b>nicht programmierbar</b>: Jeder Befehl wird durch einen Klick auf seine Schaltfläche sofort ausgeführt – ähnlich wie bei einem sehr einfachen Taschenrechner.</p>
        <p>Der Guide rechnet als Beispiel {k('5 + 3')}.</p>
      </>
    ),
  },
  {
    title: 'Der Akkumulator',
    target: 'ac',
    body: (
      <>
        <p>Der <b>Akkumulator (AC)</b> ist die universelle Speicherzelle im Prozessor. Alle Rechenergebnisse landen hier.</p>
        <p>{k('INC')} und {k('DEC')} erhöhen bzw. vermindern den AC direkt um 1 – ohne Speicherzelle.</p>
      </>
    ),
  },
  {
    title: 'Befehle mit Speicherzelle',
    target: 'befehle',
    body: (
      <>
        <p>Diese Befehle arbeiten mit einer Zelle des Speichers: {k('LDA')}/{k('STA')} kopieren zwischen Speicher und AC, {k('ADD')}, {k('SUB')}, {k('MUL')} und {k('DIV')} verknüpfen den AC mit einer Zelle.</p>
        <p>Nach dem Klick auf den Befehl muss die gewünschte Zelle im Speicher angeklickt werden. Mit [Esc] oder „Abbrechen“ bricht man ab.</p>
      </>
    ),
  },
  {
    title: 'Der Speicher',
    target: 'speicher',
    body: (
      <>
        <p>Jede Zeile ist eine Speicherzelle: links die <b>Adresse</b> (0 … 255), rechts der <b>Inhalt</b> als 16-Bit-Dualzahl.</p>
        <p>Wartet ein Befehl auf eine Zelle, wird der Speicher rot umrandet und die Zeilen sind anklickbar.</p>
      </>
    ),
  },
  {
    title: 'Erste Zahl eingeben: INM 8',
    target: 'eingabe',
    body: (
      <>
        <p>Die Eingabe erfolgt binär über 16 Kästchen (Haken = 1).</p>
        <p>Ablauf: {k('INM')} anklicken → Zelle 8 anklicken → {k('0000 0000  0000 0101')} (= 5) ankreuzen → „übernehmen“.</p>
        <p>Der Guide hat das gerade für dich erledigt: Zelle 8 enthält jetzt 5.</p>
      </>
    ),
    apply: (m) => run(m, 'INM', 8, 5),
  },
  {
    title: 'Zweite Zahl: INM 9',
    target: 'speicher',
    body: <p>Genauso wurde die 3 ({k('0000 0000  0000 0011')}) in Zelle 9 gespeichert.</p>,
    apply: (m) => run(m, 'INM', 9, 3),
  },
  {
    title: 'Rechnen: LDA 8, ADD 9',
    target: 'ac',
    body: (
      <>
        <p>Vor dem Rechnen muss ein Operand im AC stehen: {k('LDA 8')} kopiert Zelle 8 in den AC.</p>
        <p>{k('ADD 9')} addiert Zelle 9 zum AC. Das Ergebnis 8 steht jetzt im AC.</p>
      </>
    ),
    apply: (m) => run(run(m, 'LDA', 8), 'ADD', 9),
  },
  {
    title: 'Ausgeben: STA 10, OUTM 10',
    target: 'ausgabe',
    body: (
      <>
        <p>Der AC ist von außen nicht sichtbar. Deshalb wird das Ergebnis mit {k('STA 10')} in Zelle 10 gespeichert und mit {k('OUTM 10')} in die Ausgabe kopiert.</p>
        <p>Die „LEDs“ zeigen das Ergebnis binär, darunter steht es dezimal.</p>
      </>
    ),
    apply: (m) => run(run(m, 'STA', 10), 'OUTM', 10),
  },
  {
    title: 'Das Protokoll',
    target: 'protokoll',
    body: (
      <>
        <p>Jeder ausgeführte Befehl wurde protokolliert. Diese Folge von Anweisungen ist schon fast ein <b>Programm</b>.</p>
        <p>Speichert man die Befehle als Zahlen im Speicher, kann ein Rechner sie selbst holen, dekodieren und ausführen – der <b>von-Neumann-Zyklus</b>. Mehr dazu unter Hilfe → Hilfe.</p>
      </>
    ),
  },
  {
    title: 'Weitere Befehle und Skins',
    target: 'menu',
    body: (
      <>
        <p>Unter „Ansicht“ lassen sich Schiebebefehle ({k('SHL')}, {k('SHR')}), {k('NEG')} und die Logikbefehle ({k('AND')}, {k('OR')}, {k('XOR')}) einblenden, der AC binär anzeigen und ein Skin wählen.</p>
        <p>Nach „Fertig“ ist der Rechner wieder im Zustand von vor dem Guide.</p>
      </>
    ),
  },
]
