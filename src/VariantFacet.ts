import { Component, IComponentBindings, ComponentOptions, Facet, IFacetOptions, DynamicFacet, IDynamicFacet, IDynamicFacetOptions, QueryEvents, IDoneBuildingQueryEventArgs, ExpressionBuilder, QueryBuilder, DefaultInstantiateTemplateOptions, IBuildingQueryEventArgs, INewQueryEventArgs, IDuringQueryEventArgs } from 'coveo-search-ui';
import { lazyComponent } from '@coveops/turbo-core';

export interface IVariantFacetManagerOptions {
  parentQuery: string;
  childQuery: string;
  idField: string;
};

export interface IVariantFieldDefinition {
  field: string;
  isVariant: boolean;
  isDynamic: boolean;
  values: string[];
  hasSelectedValue: boolean;
}


export interface IBuildingCommerceQueryArgs {
  variantFieldDefinitions: IVariantFieldDefinition[];
  queryBuilder: QueryBuilder;
}

export interface IDoneBuildingCommerceQueryArgs extends IBuildingCommerceQueryArgs {
  variantExpression: ExpressionBuilder;
}


@lazyComponent
export class VariantFacetManager extends Component {
  static ID = 'VariantFacetManager';
  static options: IVariantFacetManagerOptions = {
      parentQuery: ComponentOptions.buildStringOption({ defaultValue: '' }),
      childQuery: ComponentOptions.buildStringOption({ defaultValue: '' }),
      idField: ComponentOptions.buildStringOption({ defaultValue: '' })
  };

  public previousNested: string;

  constructor(public element: HTMLElement, public options: IVariantFacetManagerOptions, public bindings: IComponentBindings) {
      super(element, VariantFacetManager.ID, bindings);
      this.options = ComponentOptions.initComponentOptions(element, VariantFacetManager, options);
      this.bind.onRootElement(QueryEvents.doneBuildingQuery, (args: IDoneBuildingQueryEventArgs) => this.handleDoneBuildingQuery(args));
  }

  //Is the field a variant field
  private isVariantField(variantFacets, field) {
    let isVariant=false;
    variantFacets.forEach(facet =>{
        if (field==facet.getAttribute('data-field')){
          isVariant = true;
          return isVariant;
        }
    });
    return isVariant;
  }

  //Check group by requests for facets and for variant fields
  private getGroupBy(args, allVariantFacets, buildingCommerceQueryArgs){
    args.queryBuilder.groupByRequests.forEach(facet =>{
      const theFacet = Coveo.get(<HTMLElement>document.querySelector(".CoveoFacet[data-field='"+facet.field+"']"), Coveo.Facet) as Coveo.Facet;
      const facetValues = theFacet.getSelectedValues();
      const isVariant = this.isVariantField(allVariantFacets,facet.field);
      buildingCommerceQueryArgs.variantFieldDefinitions.push({
        field: facet.field,
        values: facetValues,
        isVariant: isVariant,
        isDynamic: false,
        hasSelectedValue: facetValues.length > 0
      });
    });
  }

  //Check facet requests for facets and for variant fields
  //Dynamic Facets sucks, do not implement anything!!!
  /*private getFacets(args, allVariantFacets, buildingCommerceQueryArgs){
    args.queryBuilder.facetRequests.forEach(facet =>{
      const theFacet = Coveo.get(<HTMLElement>document.querySelector(".CoveoDynamicFacet[data-field='"+facet.field+"']"), Coveo.DynamicFacet) as Coveo.DynamicFacet;
      //Really nice backwards compatibility... this is not the same as with Facet
      const facetValues = theFacet.values.selectedValues;
      const isVariant = this.isVariantField(allVariantFacets,facet.field);
      buildingCommerceQueryArgs.variantFieldDefinitions.push({
        field: facet.options.field.toString(),
        values: facetValues,
        isVariant: isVariant,
        isDynamic: true,
        hasSelectedValue: facetValues.length > 0
      });
    });
  }*/

  private buildVariantExpression(buildingCommerceQueryArgs){
    let expression = buildingCommerceQueryArgs.variantFieldDefinitions
      .filter(definition => definition.hasSelectedValue)
      .filter(definition => definition.isVariant)
      .reduce((builder, currentField) => {
        builder.addFieldExpression(currentField.field, "==", currentField.values);
        return builder;
      }, new ExpressionBuilder());
    return expression;
  }

  private removeVariantsFromAdvanced(args, buildingCommerceQueryArgs){
     // Remove the variant expression from the normal AQ expression
    const removeExpressionForFacet = (queryBuilder: QueryBuilder, variantFieldDefinition: IVariantFieldDefinition) => {
      const expressionFromFacet = new ExpressionBuilder();
      expressionFromFacet.addFieldExpression(variantFieldDefinition.field, "==", variantFieldDefinition.values);
      const expressionToRemove = expressionFromFacet.build();
      //Remove the expression from the AdvancedExpression
      queryBuilder.advancedExpression.remove(expressionToRemove);
      //Remove it also from the GroupByRequests
        queryBuilder.groupByRequests
          .filter(groupBy => !!groupBy.advancedQueryOverride)
          .forEach(groupBy => groupBy.advancedQueryOverride = groupBy.advancedQueryOverride.replace(expressionToRemove, ""));
    };
    buildingCommerceQueryArgs.variantFieldDefinitions
      .filter(definition => definition.hasSelectedValue)
      .filter(definition => definition.isVariant)
      .forEach(definition => removeExpressionForFacet(args.queryBuilder, definition));
  }

  private handleDoneBuildingQuery(args: IDoneBuildingQueryEventArgs) {
    const buildingCommerceQueryArgs: IDoneBuildingCommerceQueryArgs = {
      variantFieldDefinitions: [],
      queryBuilder: args.queryBuilder,
      variantExpression: new ExpressionBuilder()
    };
     //Get all Variant facets
     let allVariantFacets = document.querySelectorAll(".CoveoFacet[data-variant='true']");
     //Get all facets
     let allFacets = document.querySelectorAll(".CoveoFacet");

     //Dynamic facets do not work with this procedure
     //Get all Variant dynamic facets
     //let allVariantDynamicFacets = document.querySelectorAll(".CoveoDynamicFacet[data-variant='true']");
     //Get all dynamic facets
     //let allDynamicFacets = document.querySelectorAll(".CoveoDynamicFacet");
     //Get all facets and variants defined in the groupby request
     this.getGroupBy(args, allVariantFacets, buildingCommerceQueryArgs);
     //Get all facets and variants defined in the facets request
     //this.getFacets(args, allVariantDynamicFacets, buildingCommerceQueryArgs);

     //We now have all the variantFieldDefinitions to start processing
     //Get the variant expression. This will contain @school==NY @degree=MBA
     let variantExpression = this.buildVariantExpression(buildingCommerceQueryArgs);

     //Remove the variants from the normal advanced expression (because we need to create nested)
     //Make sure to also remove the already added nested ones
     this.removeVariantsFromAdvanced(args, buildingCommerceQueryArgs);

     //Now add the variants expression
     // Add the expressions from the selected values
    // to the pre-defined inventory nested expression
    const nestedExpressionForVariants = [
      '['+this.options.idField+']',
      (variantExpression.build() || ""),
      this.options.childQuery,
    ];
    
    //The advanced for variants is @school=NY @region=MBA [@idfield] @country=NL @type=Person
    // the basic and contantexpression also need to be part of this
    const advancedForVariants = new ExpressionBuilder();
    advancedForVariants.add([
      (variantExpression.build() || ""),
      '[['+this.options.idField+']',
      (args.queryBuilder.advancedExpression.build() || ""),
      (args.queryBuilder.constantExpression.build() || ""),
      (args.queryBuilder.expression.build() || ""),
      this.options.parentQuery,']'].join(' '));
    //console.log("ADVANCED FOR VARIANTS: "+advancedForVariants.build());

    //Add the nested expression for variants to the query
    this.previousNested = this.options.parentQuery+ ' [' + nestedExpressionForVariants.join(" ") + ']';
    args.queryBuilder.advancedExpression.add(this.previousNested);
    //Now add the new advancedexpression to all groupbyRequests which are NOT variants
     args.queryBuilder.groupByRequests
     .filter(groupBy => buildingCommerceQueryArgs.variantFieldDefinitions.filter(definition => definition.isVariant).map(definition => definition.field).indexOf(groupBy.field) === -1)
     .forEach(groupBy => {
       const currentAQparts = args.queryBuilder.advancedExpression
         .getParts()
         .filter(part => part.indexOf(groupBy.field) === -1)
         .join(" ");
       groupBy.advancedQueryOverride = currentAQparts;
       groupBy.constantQueryOverride = args.queryBuilder.constantExpression.build();
       groupBy.queryOverride = args.queryBuilder.expression.build();
       //Fix the component
       const theFacet = Coveo.get(<HTMLElement>document.querySelector(".CoveoFacet[data-field='"+groupBy.field+"']"), Coveo.Facet) as Coveo.Facet;
       //We need to fix the Query for the Search on the Facet
       theFacet.facetQueryController.advancedExpressionToUseForFacetSearch = currentAQparts;
     });
    
    //Now add the variant advanced expression to the Variants
    args.queryBuilder.groupByRequests
    .filter(groupBy => buildingCommerceQueryArgs.variantFieldDefinitions.filter(definition => !definition.isVariant).map(definition => definition.field).indexOf(groupBy.field) === -1)
    .forEach(groupBy => {
      const currentAQparts =advancedForVariants
        .getParts()
        .join(" ");
      groupBy.advancedQueryOverride = currentAQparts;
      //Fix the component
      const theFacet = Coveo.get(<HTMLElement>document.querySelector(".CoveoFacet[data-field='"+groupBy.field+"']"), Coveo.Facet) as Coveo.Facet;
      //We need to fix the Query for the Search on the Facet
      theFacet.facetQueryController.advancedExpressionToUseForFacetSearch = currentAQparts;
   });
   
  }
}