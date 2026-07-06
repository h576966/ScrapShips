import Phaser from "phaser";
import {
  ATTRIBUTE_TOTAL_MAX,
  ATTRIBUTE_VALUE_MAX,
  MAX_SHIPS_PER_PROFILE,
  SHIP_ATTRIBUTE_KEYS
} from "../data/balance";
import { ensureTwoPlayableProfiles } from "../data/defaultProfiles";
import { GADGET_OPTIONS, isGadgetType } from "../data/gadgets";
import {
  ENGINE_STYLE_OPTIONS,
  NOSE_STYLE_OPTIONS,
  WING_STYLE_OPTIONS,
  isEngineStyle,
  isNoseStyle,
  isWingStyle,
  normalizeShipVisual
} from "../data/shipVisualOptions";
import {
  WEAPON_DEFINITIONS,
  getWeaponDefinition,
  isWeaponType
} from "../data/weapons";
import {
  HULL_PRESETS,
  findHullPresetId,
  formatModifierValue,
  getHullModifierSummary
} from "../data/hullPresets";
import type {
  EngineStyle,
  GadgetType,
  HullPresetId,
  NoseStyle,
  PlayerProfile,
  ShipAttributes,
  ShipBuild,
  WeaponType,
  WingStyle
} from "../model";
import {
  getShipPreviewStatLabels,
  renderShipPreviewSvg
} from "../rendering/ShipVisualFactory";
import {
  canAddShip,
  createShip,
  deleteShip,
  duplicateShip,
  getActiveShip,
  renameProfile,
  renameShip,
  selectActiveShip,
  updateShipAttributes,
  updateShipColors,
  updateShipGadget,
  updateShipHullPreset,
  updateShipPrimaryWeapon,
  updateShipVisual,
  validatePlayerProfile,
  type ProfileEditResult
} from "../services/ProfileService";
import { loadProfiles, saveProfiles } from "../services/SaveService";
import {
  calculateShipStats,
  getHullAttributeModifierForShip
} from "../services/ShipStatsCalculator";
import { getAttributeTotal } from "../services/ShipValidator";
import { escapeHtml, renderSelectOptions } from "../ui/html";

type PlayerSlot = "p1" | "p2";

export class GarageScene extends Phaser.Scene {
  private root!: HTMLDivElement;
  private profiles: PlayerProfile[] = [];
  private slotProfileIds: Record<PlayerSlot, string> = { p1: "", p2: "" };
  private editingSlot: PlayerSlot = "p1";
  private status = "Edits save locally.";

  constructor() {
    super("GarageScene");
  }

  create(): void {
    this.add.rectangle(512, 320, 1024, 640, 0x07111c);

    const loadedProfiles = loadProfiles();
    this.profiles = ensureTwoPlayableProfiles(loadedProfiles);
    if (!loadedProfiles || loadedProfiles.length < 2) {
      saveProfiles(this.profiles);
    }

    this.slotProfileIds = {
      p1: this.profiles[0].id,
      p2: this.profiles[1].id
    };

    this.root = document.createElement("div");
    this.root.className = "garage-ui";
    document.getElementById("game-root")?.appendChild(this.root);

    this.root.addEventListener("click", this.handleClick);
    this.root.addEventListener("change", this.handleChange);
    this.render();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "button[data-action]"
    );
    if (!button || button.disabled) {
      return;
    }

    const action = button.dataset.action;
    const slot = toSlot(button.dataset.slot);

    if (action === "main-menu") {
      this.scene.start("MainMenuScene");
      return;
    }

    if (action === "start-duel") {
      this.startDuel();
      return;
    }

    if (!slot) {
      return;
    }

    if (action === "edit-slot") {
      this.editingSlot = slot;
      this.render();
      return;
    }

    const profile = this.getProfileForSlot(slot);
    const activeShip = getActiveShip(profile);

    if (action === "select-ship") {
      this.editingSlot = slot;
      this.commit(selectActiveShip(profile, button.dataset.shipId ?? ""));
      return;
    }

    if (action === "create-ship") {
      this.editingSlot = slot;
      this.commit(createShip(profile));
      return;
    }

    if (action === "duplicate-ship" && activeShip) {
      this.editingSlot = slot;
      this.commit(duplicateShip(profile, activeShip.id));
      return;
    }

    if (action === "delete-ship" && activeShip) {
      this.editingSlot = slot;
      this.commit(deleteShip(profile, activeShip.id));
      return;
    }

    if (action === "attribute" && activeShip) {
      const attribute = toAttribute(button.dataset.attribute);
      const delta = Number(button.dataset.delta ?? 0);
      if (!attribute || !Number.isFinite(delta)) {
        return;
      }

      const attributes = {
        ...activeShip.attributes,
        [attribute]: activeShip.attributes[attribute] + delta
      };
      this.commit(updateShipAttributes(profile, activeShip.id, attributes));
      return;
    }

    if (action === "hull-preset" && activeShip) {
      const preset = toHullPresetId(button.dataset.preset);
      if (preset) {
        this.commit(updateShipHullPreset(profile, activeShip.id, preset));
      }
    }
  };

  private readonly handleChange = (event: Event): void => {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const action = target.dataset.action;
    const slot = toSlot(target.dataset.slot);

    if (action === "select-profile" && slot) {
      this.setProfileForSlot(slot, target.value);
      this.editingSlot = slot;
      this.render();
      return;
    }

    if (action === "profile-name" && slot) {
      this.editingSlot = slot;
      this.commit(renameProfile(this.getProfileForSlot(slot), target.value));
      return;
    }

    const profile = this.getProfileForSlot(this.editingSlot);
    const activeShip = getActiveShip(profile);
    if (!activeShip) {
      return;
    }

    if (action === "rename") {
      this.commit(renameShip(profile, activeShip.id, target.value));
      return;
    }

    if (action === "primary-color" || action === "secondary-color") {
      this.commit(
        updateShipColors(profile, activeShip.id, {
          ...activeShip.colors,
          [action === "primary-color" ? "primary" : "secondary"]: target.value
        })
      );
      return;
    }

    if (action === "gadget") {
      const gadget = toGadgetType(target.value);
      if (gadget) {
        this.commit(updateShipGadget(profile, activeShip.id, gadget));
      }
      return;
    }

    if (action === "primary-weapon") {
      const primaryWeapon = toWeaponType(target.value);
      if (primaryWeapon) {
        this.commit(updateShipPrimaryWeapon(profile, activeShip.id, primaryWeapon));
      }
      return;
    }

    if (action === "accent-color") {
      this.commit(updateShipVisual(profile, activeShip.id, { accentColor: target.value }));
      return;
    }

    if (action === "nose-style") {
      const noseStyle = toNoseStyle(target.value);
      if (noseStyle) {
        this.commit(updateShipVisual(profile, activeShip.id, { noseStyle }));
      }
      return;
    }

    if (action === "wing-style") {
      const wingStyle = toWingStyle(target.value);
      if (wingStyle) {
        this.commit(updateShipVisual(profile, activeShip.id, { wingStyle }));
      }
      return;
    }

    if (action === "engine-style") {
      const engineStyle = toEngineStyle(target.value);
      if (engineStyle) {
        this.commit(updateShipVisual(profile, activeShip.id, { engineStyle }));
      }
    }
  };

  private render(): void {
    const editingProfile = this.getProfileForSlot(this.editingSlot);
    const editingShip = getActiveShip(editingProfile);

    this.root.innerHTML = `
      <main class="garage-shell">
        <header class="garage-header">
          <div>
            <h1>Ship Garage</h1>
            <p>${escapeHtml(this.status)}</p>
          </div>
          <div class="garage-actions">
            <button type="button" data-action="main-menu">Main Menu</button>
            <button type="button" class="primary" data-action="start-duel">Start Duel</button>
          </div>
        </header>
        <section class="garage-grid">
          ${this.renderPlayerPanel("p1")}
          ${this.renderBuilderPanel(editingProfile, editingShip)}
          ${this.renderPlayerPanel("p2")}
        </section>
      </main>
    `;
  }

  private renderPlayerPanel(slot: PlayerSlot): string {
    const profile = this.getProfileForSlot(slot);
    const isEditing = this.editingSlot === slot;
    const activeShip = getActiveShip(profile);
    const shipRows = profile.ships
      .map((ship) => this.renderShipRow(slot, profile, ship))
      .join("");

    return `
      <section class="garage-panel ${isEditing ? "selected" : ""}">
        <div class="panel-title">
          <h2>${slot === "p1" ? "Player 1" : "Player 2"}</h2>
          <button type="button" data-action="edit-slot" data-slot="${slot}">Edit</button>
        </div>
        <label class="field-label">
          Profile
          <select data-action="select-profile" data-slot="${slot}">
            ${renderSelectOptions(
              this.profiles.map((candidate) => ({
                value: candidate.id,
                label: candidate.name
              })),
              profile.id
            )}
          </select>
        </label>
        <label class="field-label">
          Display name
          <input data-action="profile-name" data-slot="${slot}" value="${escapeHtml(profile.name)}" maxlength="24" />
        </label>
        <div class="ship-count">Ships ${profile.ships.length}/${MAX_SHIPS_PER_PROFILE}</div>
        <div class="ship-list">${shipRows}</div>
        <div class="button-row">
          <button type="button" data-action="create-ship" data-slot="${slot}" ${
            canAddShip(profile) ? "" : "disabled"
          }>New</button>
          <button type="button" data-action="duplicate-ship" data-slot="${slot}" ${
            activeShip && canAddShip(profile) ? "" : "disabled"
          }>Duplicate</button>
          <button type="button" data-action="delete-ship" data-slot="${slot}" ${
            profile.ships.length > 1 ? "" : "disabled"
          }>Delete</button>
        </div>
      </section>
    `;
  }

  private renderShipRow(slot: PlayerSlot, profile: PlayerProfile, ship: ShipBuild): string {
    const active = ship.id === profile.activeShipId;
    const attributes = getAttributeTotal(ship.attributes);
    const stats = calculateShipStats(ship);
    const weapon = getWeaponDefinition(ship.primaryWeapon);
    return `
      <button type="button" class="ship-row ${active ? "active" : ""}"
        data-action="select-ship" data-slot="${slot}" data-ship-id="${escapeHtml(ship.id)}">
        <span class="ship-swatch" style="background:${escapeHtml(ship.colors.primary)}"></span>
        <span>
          <strong>${escapeHtml(ship.name)}</strong>
          <small>${weapon.label} | ${attributes}/${ATTRIBUTE_TOTAL_MAX} pts | mass ${stats.mass}</small>
        </span>
      </button>
    `;
  }

  private renderBuilderPanel(profile: PlayerProfile, ship: ShipBuild | undefined): string {
    if (!ship) {
      return `
        <section class="garage-panel builder-panel">
          <h2>Builder</h2>
          <p>No active ship selected.</p>
        </section>
      `;
    }

    const total = getAttributeTotal(ship.attributes);
    const remaining = ATTRIBUTE_TOTAL_MAX - total;
    const stats = calculateShipStats(ship);
    const visual = normalizeShipVisual(ship.visual, findHullPresetId(ship.hullShape));
    const weapon = getWeaponDefinition(ship.primaryWeapon);
    const previewStats = getShipPreviewStatLabels(ship);

    return `
      <section class="garage-panel builder-panel">
        <div class="panel-title">
          <h2>${escapeHtml(profile.name)} Builder</h2>
          <span>${remaining} points left</span>
        </div>
        <label class="field-label">
          Ship name
          <input data-action="rename" value="${escapeHtml(ship.name)}" maxlength="28" />
        </label>
        <div class="color-row">
          <label class="field-label">
            Primary
            <input type="color" data-action="primary-color" value="${escapeHtml(ship.colors.primary)}" />
          </label>
          <label class="field-label">
            Secondary
            <input type="color" data-action="secondary-color" value="${escapeHtml(ship.colors.secondary)}" />
          </label>
          <label class="field-label">
            Accent
            <input type="color" data-action="accent-color" value="${escapeHtml(visual.accentColor)}" />
          </label>
        </div>
        <div class="ship-preview">
          <div class="ship-preview-art">
            ${renderShipPreviewSvg(ship)}
          </div>
          <dl class="ship-preview-stats">
            ${previewStats
              .map(
                (item) => `
                  <div>
                    <dt>${escapeHtml(item.label)}</dt>
                    <dd>${escapeHtml(item.value)}</dd>
                  </div>
                `
              )
              .join("")}
          </dl>
        </div>
        <div class="builder-section design-section">
          <div class="section-heading">
            <h3>Shape & Silhouette</h3>
            <span>Hull trade-off and profile</span>
          </div>
          <div class="hull-option-grid">
            ${HULL_PRESETS.map(
              (preset) => `
                <button type="button" data-action="hull-preset" data-slot="${this.editingSlot}"
                  data-preset="${preset.id}" class="${visual.hullPreset === preset.id ? "active" : ""}">
                  <strong>${preset.label}</strong>
                  <small>${escapeHtml(getHullModifierSummary(preset.id))}</small>
                </button>
              `
            ).join("")}
          </div>
          <div class="visual-grid silhouette-controls">
            <label class="field-label">
              Nose
              <select data-action="nose-style">
                ${renderSelectOptions(NOSE_STYLE_OPTIONS, visual.noseStyle)}
              </select>
            </label>
            <label class="field-label">
              Wings
              <select data-action="wing-style">
                ${renderSelectOptions(WING_STYLE_OPTIONS, visual.wingStyle)}
              </select>
            </label>
            <label class="field-label">
              Engine
              <select data-action="engine-style">
                ${renderSelectOptions(ENGINE_STYLE_OPTIONS, visual.engineStyle)}
              </select>
            </label>
          </div>
        </div>
        <div class="builder-section">
          <div class="section-heading">
            <h3>Attributes</h3>
            <span>${total}/${ATTRIBUTE_TOTAL_MAX} base points</span>
          </div>
          ${SHIP_ATTRIBUTE_KEYS.map((attribute) =>
            this.renderAttributeRow(this.editingSlot, ship, attribute)
          ).join("")}
        </div>
        <div class="builder-section">
          <div class="section-heading">
            <h3>Loadout</h3>
            <span>Primary and gadget</span>
          </div>
          <div class="loadout-grid">
            <label class="field-label">
              Primary weapon
              <select data-action="primary-weapon">
                ${renderSelectOptions(
                  WEAPON_DEFINITIONS.map((candidate) => ({
                    value: candidate.type,
                    label: candidate.label
                  })),
                  ship.primaryWeapon
                )}
              </select>
            </label>
            <label class="field-label">
              Gadget
              <select data-action="gadget">
                ${renderSelectOptions(
                  GADGET_OPTIONS.map((gadget) => ({
                    value: gadget.value,
                    label: gadget.label
                  })),
                  ship.gadget ?? "none"
                )}
              </select>
            </label>
          </div>
          <div class="weapon-summary">
            Range ${weapon.range} | ${weapon.mode === "continuous" ? `${weapon.baseDamage} DPS` : `${weapon.baseDamage} dmg`}
            | ${weapon.cooldownMs > 0 ? `${Math.round(1000 / weapon.cooldownMs)} shots/sec` : "hold beam"}
            | ${escapeHtml(weapon.difficulty)}
          </div>
        </div>
        <div class="stats-line">
          Hull pixels ${ship.hullShape.pixels.length} | mass ${stats.mass} |
          speed ${stats.maxSpeed} | turn ${stats.turnRate}
        </div>
      </section>
    `;
  }

  private renderAttributeRow(
    slot: PlayerSlot,
    ship: ShipBuild,
    attribute: keyof ShipAttributes
  ): string {
    const attributes = ship.attributes;
    const value = attributes[attribute];
    const total = getAttributeTotal(attributes);
    const modifier = getHullAttributeModifierForShip(ship)[attribute] ?? 0;
    const modifierText =
      modifier === 0
        ? ""
        : ` <small>(${formatModifierValue(modifier)} hull shape)</small>`;
    return `
      <div class="attribute-row">
        <span>${attribute}</span>
        <button type="button" data-action="attribute" data-slot="${slot}"
          data-attribute="${attribute}" data-delta="-1" ${value <= 0 ? "disabled" : ""}>-</button>
        <strong>${value}${modifierText}</strong>
        <button type="button" data-action="attribute" data-slot="${slot}"
          data-attribute="${attribute}" data-delta="1" ${
            value >= ATTRIBUTE_VALUE_MAX || total >= ATTRIBUTE_TOTAL_MAX ? "disabled" : ""
          }>+</button>
      </div>
    `;
  }

  private commit(result: ProfileEditResult): void {
    if (!result.ok) {
      this.status = result.error ?? "Edit was rejected.";
      this.render();
      return;
    }

    this.profiles = this.profiles.map((profile) =>
      profile.id === result.profile.id ? result.profile : profile
    );
    this.status = "Saved.";
    this.save();
    this.render();
  }

  private save(): boolean {
    const invalid = this.profiles.find(
      (profile) => !validatePlayerProfile(profile).valid
    );
    if (invalid) {
      this.status = `Could not save ${invalid.name}.`;
      return false;
    }

    if (!saveProfiles(this.profiles)) {
      this.status = "Could not save profile data.";
      return false;
    }

    return true;
  }

  private startDuel(): void {
    if (!this.save()) {
      this.render();
      return;
    }

    const p1Profile = this.getProfileForSlot("p1");
    const p2Profile = this.getProfileForSlot("p2");
    const p1Ship = getActiveShip(p1Profile);
    const p2Ship = getActiveShip(p2Profile);

    if (!p1Ship || !p2Ship) {
      this.status = "Both players need an active ship.";
      this.render();
      return;
    }

    this.scene.start("DuelScene", {
      p1: { profileId: p1Profile.id, shipId: p1Ship.id },
      p2: { profileId: p2Profile.id, shipId: p2Ship.id }
    });
  }

  private setProfileForSlot(slot: PlayerSlot, profileId: string): void {
    const selectedProfile = this.profiles.find((profile) => profile.id === profileId);
    if (!selectedProfile) {
      return;
    }

    const otherSlot = slot === "p1" ? "p2" : "p1";
    this.slotProfileIds[slot] = selectedProfile.id;

    if (this.slotProfileIds[otherSlot] === selectedProfile.id && this.profiles.length > 1) {
      const fallback = this.profiles.find((profile) => profile.id !== selectedProfile.id);
      if (fallback) {
        this.slotProfileIds[otherSlot] = fallback.id;
      }
    }
  }

  private getProfileForSlot(slot: PlayerSlot): PlayerProfile {
    const fallbackIndex = slot === "p1" ? 0 : 1;
    const profile =
      this.profiles.find((candidate) => candidate.id === this.slotProfileIds[slot]) ??
      this.profiles[fallbackIndex] ??
      this.profiles[0];
    this.slotProfileIds[slot] = profile.id;
    return profile;
  }

  private shutdown(): void {
    this.root.removeEventListener("click", this.handleClick);
    this.root.removeEventListener("change", this.handleChange);
    this.root.remove();
  }
}

function toSlot(value: string | undefined): PlayerSlot | undefined {
  return value === "p1" || value === "p2" ? value : undefined;
}

function toAttribute(value: string | undefined): keyof ShipAttributes | undefined {
  return SHIP_ATTRIBUTE_KEYS.find((attribute) => attribute === value);
}

function toHullPresetId(value: string | undefined): HullPresetId | undefined {
  return HULL_PRESETS.find((preset) => preset.id === value)?.id;
}

function toGadgetType(value: string | undefined): GadgetType | undefined {
  return isGadgetType(value) ? value : undefined;
}

function toWeaponType(value: string | undefined): WeaponType | undefined {
  return isWeaponType(value) ? value : undefined;
}

function toNoseStyle(value: string | undefined): NoseStyle | undefined {
  return isNoseStyle(value) ? value : undefined;
}

function toWingStyle(value: string | undefined): WingStyle | undefined {
  return isWingStyle(value) ? value : undefined;
}

function toEngineStyle(value: string | undefined): EngineStyle | undefined {
  return isEngineStyle(value) ? value : undefined;
}
