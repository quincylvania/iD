import {
    event as d3_event,
    select as d3_select
} from 'd3-selection';

import { d3combobox as d3_combobox } from '../lib/d3.combobox.js';

import { t } from '../util/locale';
import { actionChangeMember, actionDeleteMember } from '../actions';
import { modeBrowse, modeSelect } from '../modes';
import { osmEntity } from '../osm';
import { svgIcon } from '../svg';
import { services } from '../services';
import { uiDisclosure } from './disclosure';
import {
    utilDisplayName,
    utilDisplayType,
    utilNoAuto
} from '../util';


export function uiRouteStopsEditor(context) {
    var _entityID;

    function selectMember(d) {
        d3_event.preventDefault();

        var entity = context.entity(d.id);
        var mapExtent = context.map().extent();
        if (!entity.intersects(mapExtent, context.graph())) {
            // zoom to the entity if its extent is not visible now
            context.map().zoomTo(entity);
        }

        context.enter(modeSelect(context, [d.id]));
    }

/*
    function deleteMember(d) {
        context.perform(
            actionDeleteMember(d.relation.id, d.index),
            t('operations.delete_member.annotation')
        );

        if (!context.hasEntity(d.relation.id)) {
            context.enter(modeBrowse(context));
        }
    }
*/

    function routeStopsEditor(selection) {
        var entity = context.entity(_entityID),
            memberships = [];
        var stopMembers = entity.members.filter(function(member){
            return member.role == "stop" || member.role == "stop_exit_only" || member.role == "stop_entry_only";
        });
        var unloadedStopIDs = stopMembers.filter(function(member){
            return !context.hasEntity(member.id);
        }).map(function(member){
            return member.id;
        });
        context.loadEntities(unloadedStopIDs);

        stopMembers.slice(0, 1000).forEach(function(member, index) {
            memberships.push({
                index: index,
                id: member.id,
                type: member.type,
                role: member.role,
                relation: entity,
                member: context.hasEntity(member.id)
            });
        });

        var gt = stopMembers.length > 1000 ? '>' : '';
        selection.call(uiDisclosure(context, 'raw_member_editor', true)
            .title(t('inspector.route_stops') + ' (' + gt + memberships.length + ')')
            .expanded(true)
            .updatePreference(false)
            .on('toggled', function(expanded) {
                if (expanded) { selection.node().parentNode.scrollTop += 200; }
            })
            .content(content)
        );

        function content(wrap) {

            var list = wrap.selectAll('.route-stop-list')
                .data([0]);

            list = list.enter()
                .append('ul')
                .attr('class', 'route-stop-list')
                .merge(list);

            var items = list.selectAll('li')
                .data(memberships, function(d) {
                    return osmEntity.key(d.relation) + ',' + d.index + ',' +
                        (d.member ? osmEntity.key(d.member) : 'incomplete');
                });

            items.exit()
                .remove();

            if (unloadedStopIDs.length !== 0) {
                return;
            }

            var enter = items.enter()
                .append('li')
                .attr('class', 'route-stop-row');

            var color = entity.tags.colour;

            // returns true if the browser can render the string as a color
            function isColor(strColor){
                // regex for hex color codes, such as #aa0 or #191970
                if (RegExp('^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$').test(color)) {
                    return true;
                }
                var s = new Option().style;
                s.color = strColor;
                return s.color === strColor;
            }

            var canUseTagColor = color && isColor(color);

            enter
                .each(function(d) {

                    var item = d3_select(this);

                    // highlight the stop in the map while hovering on the list item
                    var selectorPrefix = d.type === 'node' ? 'g.' : 'path.';
                    item.on('mouseover', function() {
                        context.surface().selectAll(selectorPrefix+d.id).classed('highlighted', true);
                    });
                    item.on('mouseout', function() {
                        context.surface().selectAll(selectorPrefix+d.id).classed('highlighted', false);
                    });

                    var iconWrap = item.append('div')
                        .classed('route-stop-icon-wrap', true);

                    var routeLine = iconWrap.append('div')
                        .classed('route-stop-line', true);
                    var routeIcon = iconWrap.append('a')
                        .attr('href', '#')
                        .on('click', selectMember)
                        .append('div')
                        .classed('route-stop-icon', true);

                    if (canUseTagColor) {
                        routeLine.style('background', color);
                        routeIcon.style('border-color', color);
                    }

                    item.append('a')
                        .attr('href', '#')
                        .classed('route-stop-name', true)
                        .on('click', selectMember)
                        .text(function(d) { return utilDisplayName(d.member); });
                });
        }
    }


    routeStopsEditor.entityID = function(_) {
        if (!arguments.length) return _entityID;
        _entityID = _;
        return routeStopsEditor;
    };


    return routeStopsEditor;
}
