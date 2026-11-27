/**
 * The methodology note: static copy, never provider-dependent, so it renders whatever the state
 * of the two sections. It says what each source measures and that the two are not combined.
 */
export function DeforestationMethodology() {
  return (
    <p className="mt-6 text-sm text-fg-muted" data-testid="deforestation-methodology">
      Forest area comes from the FAO Global Forest Resources Assessment 2025: national reports of
      the net change in forest land use, with years between reports interpolated. Tree cover loss
      comes from Global Forest Watch: loss of tree cover detected by satellite since 2001, including
      loss that later regrows. The two measure different things, so they cannot be compared or added
      together. Forest includes plantations. Some national changes partly reflect better inventories
      or revised definitions.
    </p>
  );
}
