async function isKillSwitchActive() {
    const control = await SystemControl.findOne({
        where: { key: 'IGNITION_DISABLED' }
    });

    return control.value === 'true';
}