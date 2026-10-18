'use strict';
'require view';
'require rpc';
'require ui';
'require dom';

var callStatus = rpc.declare({ object: 'upnp-client', method: 'status', expect: { '': {} } });
var callMappings = rpc.declare({ object: 'upnp-client', method: 'mappings', expect: { '': {} } });
var callEnable = rpc.declare({ object: 'upnp-client', method: 'set_enabled', params: [ 'enabled' ], expect: { '': {} } });
var callAdd = rpc.declare({ object: 'upnp-client', method: 'add_mapping', params: [ 'port', 'proto', 'auto', 'lan_forward', 'lan_ip', 'lan_port' ], expect: { '': {} } });
var callRemove = rpc.declare({ object: 'upnp-client', method: 'remove_mapping', params: [ 'section' ], expect: { '': {} } });
var callAuto = rpc.declare({ object: 'upnp-client', method: 'set_auto', params: [ 'section', 'auto' ], expect: { '': {} } });
var callRequest = rpc.declare({ object: 'upnp-client', method: 'request', params: [ 'port', 'proto' ], expect: { '': {} } });
var callUnrequest = rpc.declare({ object: 'upnp-client', method: 'unrequest', params: [ 'port', 'proto' ], expect: { '': {} } });
var callRequestAll = rpc.declare({ object: 'upnp-client', method: 'request_all', expect: { '': {} } });
var callUnrequestAll = rpc.declare({ object: 'upnp-client', method: 'unrequest_all', expect: { '': {} } });
var callRefresh = rpc.declare({ object: 'upnp-client', method: 'refresh', expect: { '': {} } });
var callNatApply = rpc.declare({ object: 'upnp-client', method: 'nat_apply', expect: { '': {} } });
var callNatRevert = rpc.declare({ object: 'upnp-client', method: 'nat_revert', expect: { '': {} } });
var callSetUrl = rpc.declare({ object: 'upnp-client', method: 'set_router_url',
    params: [ 'url' ], expect: { '': {} } });

function button(label, style, fn) {
	var b = E('button', { 'class': 'btn ' + (style || 'cbi-button'), 'click': function(ev) { b.disabled = true; Promise.resolve(fn()).catch(function(e) { ui.addNotification(null, E('p', {}, _('Request failed: ') + e)); }).finally(function() { b.disabled = false; }); } }, [ label ]);
	return b;
}
function notifyResult(r) {
	ui.addNotification(null, E('p', {}, (r && r.ok ? _('Success: ') : _('Error: ')) + ((r && (r.message || r.output)) || _('No response'))), r && r.ok ? 'info' : 'error');
}
function reloadView() { window.location.reload(); }

return view.extend({
	load: function() { return Promise.all([ callStatus(), callMappings() ]); },
	render: function(data) {
		var status = data[0] || {}, mappings = (data[1] && data[1].mappings) || [];
var relayed = (data[1] && data[1].relayed) || [];
var relayHead = E('tr', { 'class': 'tr table-titles' }, [
    E('th', { 'class': 'th' }, [ _('Port') ]),
    E('th', { 'class': 'th' }, [ _('Protocol') ]),
    E('th', { 'class': 'th' }, [ _('Added by') ])
]);
var relayRows = relayed.map(function(r) {
    return E('tr', {}, [
        E('td', {}, [ r.port || '' ]),
        E('td', {}, [ r.proto || '' ]),
        E('td', {}, [ _('MiniUPnPd relay | LAN ') + (r.lan || '?') ])
    ]);
});
var relayNote = relayed.length ? '' : _('No ports are being relayed from LAN devices right now.');
var relayBox = E('div', { 'class': 'cbi-section' }, [
    E('h3', {}, [ _('Relayed from LAN devices') ]),
    E('p', {}, [ relayNote ]),
    E('table', { 'class': 'table cbi-section-table' }, [ relayHead ].concat(relayRows))
]);
		var enabled = !!status.enabled;
		var enabledBox = E('input', { 'type': 'checkbox', 'checked': enabled, 'change': function(ev) {
			var value = ev.target.checked;
			callEnable(value).then(function(r) { notifyResult(r); reloadView(); }).catch(function(e) { ev.target.checked = !value; ui.addNotification(null, E('p', {}, _('Could not change enabled state: ') + e), 'error'); });
		} });
		var portInput = E('input', { 'type': 'number', 'min': '1', 'max': '65535', 'maxlength': '5', 'placeholder': '59239', 'class': 'cbi-input-text', 'style': 'width:100%;box-sizing:border-box' });
		var protoInput = E('select', { 'class': 'cbi-input-select', 'style': 'width:100%;box-sizing:border-box' }, [ E('option', { 'value': 'TCP' }, 'TCP'), E('option', { 'value': 'UDP' }, 'UDP'), E('option', { 'value': 'BOTH' }, 'TCP+UDP') ]);
		var autoInput = E('input', { 'type': 'checkbox', 'checked': true });
		var lanForwardInput = E('input', { 'type': 'checkbox', 'checked': false });
var natApplied = status.nat_state === 'applied';
var natLabel = natApplied ? _('Revert double-NAT setup') : _('Apply double-NAT setup');
var natStyle = natApplied ? 'cbi-button cbi-button-remove' : 'cbi-button cbi-button-apply';
var natBtn = button(natLabel, natStyle, function() {
    var call = natApplied ? callNatRevert : callNatApply;
    return call().then(function(r) { notifyResult(r); reloadView(); });
});
var natText = _('Double-NAT setup (lets UPnP work when the WAN address of this device is private): ');
var natBox = E('p', {}, [ natText, E('strong', {}, [ natApplied ? _('Applied') : _('Not applied') ]), ' ', natBtn ]);
var urlInput = E('input', { 'type': 'text', 'class': 'cbi-input-text',
    'style': 'width:60%', 'value': status.router_url || '' });
var urlFound = status.router_url_found || _('not found yet');
var urlSrc = status.router_url_source === 'configured' ? _('manual override') : _('auto-detected');
var urlSave = button(_('Save override'), 'cbi-button cbi-button-apply', function() {
    return callSetUrl(urlInput.value).then(function(r) { notifyResult(r); reloadView(); });
});
var urlAuto = button(_('Use auto-detect'), 'cbi-button', function() {
    return callSetUrl('').then(function(r) { notifyResult(r); reloadView(); });
});
var urlBox = E('div', {}, [
    E('p', {}, [ _('Requested upstream ports are forwarded to the WAN IP of this device (its address on the upstream NAT router network): '), status.wan_ip || _('not available') ]),
    E('p', {}, [ _('Upstream request URL found at: '), E('strong', {}, [ urlFound ]), ' (', urlSrc, ')' ]),
    E('p', {}, [ urlInput, ' ', urlSave, ' ', urlAuto ])
]);
                enabledBox.checked = enabled; lanForwardInput.checked = false;
		var lanIpInput = E('input', { 'type': 'text', 'placeholder': 'IPv4 or IPv6 address', 'class': 'cbi-input-text', 'style': 'width:100%;box-sizing:border-box', 'disabled': true });
		var lanPortInput = E('input', { 'type': 'number', 'min': '1', 'max': '65535', 'maxlength': '5', 'placeholder': 'port', 'class': 'cbi-input-text', 'style': 'width:100%;box-sizing:border-box', 'disabled': true });
		function syncLanFields() { var on = lanForwardInput.checked; lanIpInput.disabled = !on; lanPortInput.disabled = !on; lanIpInput.style.opacity = on ? '1' : '0.45'; lanPortInput.style.opacity = on ? '1' : '0.45'; }
		lanForwardInput.addEventListener('change', syncLanFields);
		function field(label, input) { return E('div', { 'style': 'min-width:0' }, [ E('label', { 'style': 'display:block;font-size:0.9em;margin-bottom:3px' }, [ label ]), input ]); }
		function addMapping() {
			var p = Number(portInput.value), lp = Number(lanPortInput.value);
			if (!Number.isInteger(p) || p < 1 || p > 65535) { ui.addNotification(null, E('p', {}, _('Enter an external port from 1 to 65535.')), 'error'); return; }
			if (lanForwardInput.checked) {
				if (!lanIpInput.value.trim() || !Number.isInteger(lp) || lp < 1 || lp > 65535) { ui.addNotification(null, E('p', {}, _('LAN forwarding requires a LAN IP address and port from 1 to 65535.')), 'error'); return; }
			}
			var protocols = protoInput.value === 'BOTH' ? [ 'TCP', 'UDP' ] : [ protoInput.value ];
			return Promise.all(protocols.map(function(proto) { return callAdd(p, proto, autoInput.checked, lanForwardInput.checked, lanForwardInput.checked ? lanIpInput.value.trim() : '', lanForwardInput.checked ? lp : 0); })).then(function(results) { results.forEach(notifyResult); reloadView(); });
		}
		var addButton = button(_('Add'), 'cbi-button cbi-button-action', addMapping);
		var addSection = E('div', { 'class': 'cbi-section' }, [ E('h3', {}, [ _('Add mapping') ]),
			E('div', { 'style': 'display:grid;grid-template-columns:minmax(64px,1fr) minmax(76px,1.15fr) minmax(170px,2.2fr) minmax(64px,1fr);gap:8px;align-items:end;width:100%' }, [ field(_('External port'), portInput), field(_('Protocol'), protoInput), field(_('LAN IP'), lanIpInput), field(_('LAN port'), lanPortInput) ]),
			E('div', { 'style': 'display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:10px' }, [ E('label', { 'style': 'display:flex;align-items:center;gap:5px' }, [ autoInput, _('Remember / auto-request') ]), E('label', { 'style': 'display:flex;align-items:center;gap:5px' }, [ lanForwardInput, _('LAN-side forward') ]), E('div', { 'style': 'margin-left:auto' }, [ addButton ]) ])
		]);
		if (window.matchMedia && window.matchMedia('(max-width: 600px)').matches) addSection.querySelectorAll('input,select').forEach(function(el) { el.style.minWidth = '0'; });

		var tableRows = mappings.map(function(m) {
			return E('tr', {}, [
				E('td', {}, [ m.port || '' ]), E('td', {}, [ m.proto || '' ]), E('td', {}, [ _('manual') ]),
				E('td', {}, [ E('input', { 'type': 'checkbox', 'checked': !!m.auto, 'change': function(ev) { callAuto(m.section, ev.target.checked).then(notifyResult).catch(function(e) { ui.addNotification(null, E('p', {}, String(e)), 'error'); }); } }) ]),
				E('td', {}, [ button(_('Request now'), 'cbi-button cbi-button-action', function() { return callRequest(m.port, m.proto).then(notifyResult); }), ' ', button(_('Unrequest'), 'cbi-button-negative', function() { if (!confirm(_('Remove this port/protocol mapping from the upstream NAT router?'))) return; return callUnrequest(m.port, m.proto).then(notifyResult); }), ' ', button(_('Remove saved entry'), 'cbi-button', function() { if (!confirm(_('Remove this saved entry? The upstream mapping will not be deleted.'))) return; return callRemove(m.section).then(function(r) { notifyResult(r); reloadView(); }); }) ])
			]);
		});
		var upstreamOutput = E('pre', { 'style': 'white-space:pre-wrap; overflow-wrap:anywhere;' }, [ _('Use “Refresh active forwards” to query the upstream router.') ]);
		return E('div', { 'class': ' upnp-client' }, [
			E('h2', {}, [ _('UPnP Client') ]),
			E('p', {}, [ _('Request port mappings from the upstream NAT router. Optional LAN-side forwarding creates package-owned firewall4 redirects for IPv4 LAN targets.') ]),
			E('div', { 'class': 'cbi-section' }, [ E('h3', {}, [ _('Client control') ]), E('p', {}, [ _('Current state: '), E('strong', {}, [ enabled ? _('Enabled') : _('Disabled') ]), ' ', button(enabled ? _('Disable') : _('Enable'), enabled ? 'cbi-button cbi-button-remove' : 'cbi-button cbi-button-apply', function() { return callEnable(!enabled).then(function(r) { notifyResult(r); reloadView(); }); }) ]), urlBox, natBox, E('p', {}, [ _('Enabling processes checked mappings immediately and activates the package-owned WAN-up hook. Disabling stops future automatic requests but does not delete existing upstream NAT router mappings.') ]) ]),
			addSection,
			E('div', { 'class': 'cbi-section' }, [ E('h3', {}, [ _('Configured mappings') ]), E('table', { 'class': 'table cbi-section-table' }, [ E('tr', { 'class': 'tr table-titles' }, [ E('th', { 'class': 'th' }, [ _('Port') ]), E('th', { 'class': 'th' }, [ _('Protocol') ]), E('th', { 'class': 'th' }, [ _('Added by') ]), E('th', { 'class': 'th' }, [ _('Automatic') ]), E('th', { 'class': 'th' }, [ _('Actions') ]) ]) ].concat(tableRows)), E('div', { 'class': 'cbi-page-actions' }, [ button(_('Request all saved mappings now'), 'cbi-button cbi-button-action', function() { return callRequestAll().then(notifyResult); }), ' ', button(_('Unrequest all managed mappings…'), 'cbi-button-negative', function() { if (!confirm(_('Delete the configured port/protocol mappings from the upstream NAT router? Only mappings matching this package’s saved entries will be attempted.'))) return; return callUnrequestAll().then(notifyResult); }) ]) ]),
                    relayBox,
			E('div', { 'class': 'cbi-section' }, [ E('h3', {}, [ _('Upstream NAT router active forwards') ]), button(_('Refresh active forwards'), 'cbi-button cbi-button-action', function() { return callRefresh().then(function(r) { upstreamOutput.textContent = (r && r.output) || _('No output returned.'); if (!r || !r.ok) notifyResult({ ok: false, message: upstreamOutput.textContent }); }); }), upstreamOutput ])
		]);
	}
});
