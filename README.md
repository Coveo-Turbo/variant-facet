# variant-facet, implemented using VariantFacetManager

In a scenario were all the information is not stored into a single object inside the index, you might want to show facets depending on child objects.

For example:
* Product (Main object) with Size, Color and Width object (Child object).
* Resume (Main object) with Year, Degree and School object (Child object).

The requirement could be to have a search interface to quickly find:
* Products, with a specific Size & Color combination
* Resume's, with a specific Degree & School combination

If we would simply index Size, Color, Width as multi value fields then you would be able to filter on them, but not the combination.

The variant facet will create a nested query to retrieve only the values requested.

*** Important: Use the same fieldname for the Parent & Child ID's ***

## A complete example

Person object: Type=Person, Name=Wim, Country=NL, ID=12
Person object: Type=Person, Name=Peter, Country=USA, ID=13
Person object: Type=Person, Name=Annie, Country=NL, ID=14
Education object: Type=Education, ID=12, School=Alabama University, Year=1969, Degree=MBA
Education object: Type=Education, ID=12, School=NY University, Year=1989, Degree=Doctor
Education object: Type=Education, ID=13, School=NY University, Year=1979, Degree=Bachelor
Education object: Type=Education, ID=13, School=NY University, Year=1989, Degree=MBA
Education object: Type=Education, ID=13, School=NY University, Year=1999, Degree=Doctor
Education object: Type=Education, ID=14, School=SF University, Year=1989, Degree=MBA

1. No Query, Variant facet will use:
  * queryOverride: [[idField] childQuery]
2. Query, Variant facet will use:
  * queryOverride: QUERY [[idField] childQuery]
3. Query, Normal facet selected
  * advancedQuery: @country==NL (this is on the parent object)
  * queryOverride: QUERY [[idField] childQuery]
4. Query, Normal Facets selected.
  * advancedQuery: @country==NL @region==FL (this is on the parent object)
  * queryOverride: QUERY [[idField] childQuery]
5. Query, Normal Facets selected and Variant selected.
  * by default advancedQuery ==> @country==NL @region==FL @school=="NY University"
  * if Variant facet in advancedQuery then rewrite advancedQuery to:
  * advancedQuery: @country==NL @region==FL (this is on the parent object) [[idField] @school=="NY University" childQuery] (this is on the child)
  * queryOverride: QUERY [[idField] childQuery advancedQuery(nested part only)]
6. Query, Normal Facets selected and Variants selected.
  * by default advancedQuery ==> @country==NL @region==FL @school=="NY University" @degree=="MBA" 
  * if Variant facet in advancedQuery then rewrite advancedQuery to:
  * advancedQuery: @country==NL @region==FL (this is on the parent object) [[idField] @school=="NY University" @degree=="MBA" childQuery] (this is on the child)
  * queryOverride: QUERY [[idField] childQuery advancedQuery(nested part only)]

## Options
VariantFacetManager must be configured using the following options:

| Option | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `parentQuery` | Yes | string |  | The parent query for the parent object (like `@objecttype==person`) |
| `childQuery` | Yes | string |  | The child query for the child object (like `@objecttype==education`) |
| `idField` | Yes | string |  | The field to use as the unique field to bind the parent and child together |

## Usage

First enable the component in your page:
```html
<div class="CoveoVariantFacetManager" data-parent-query="@objecttype==house" data-child-query="@objecttype==rating" data-id-field="@myhouseid"></div>
```

*** Be aware `DynamicFacets` are not supported yet *** 

Then for your variant facets:
```html
            <div class="CoveoFacet" data-title="Amenities" data-field="@myamenities" ></div>
            <div class="CoveoFacet" data-title="Bed type" data-field="@mybedtype" ></div>
            <div class="CoveoFacet" data-title="Reviewed by Profile" data-variant='true' data-field="@myratingtype" ></div>
            <div class="CoveoFacet" data-title="Reviewed by Age" data-variant='true' data-field="@myratingage" ></div>
```
Add the `data-variant='true'` to your properties.


Disclaimer: This component was built by the community at large and is not an official Coveo JSUI Component. Use this component at your own risk.

## Getting Started

1. Install the component into your project.

```
npm i @coveops/variant-facet
```

2. Use the Component or extend it

Typescript:

```javascript
import { VariantFacetManager, IVariantFacetManagerOptions } from '@coveops/variant-facet';
```

Javascript

```javascript
const VariantFacetManager = require('@coveops/variant-facet').VariantFacetManager;
```

3. You can also expose the component alongside other components being built in your project.

```javascript
export * from '@coveops/variant-facet'
```

4. Include the component in your template as follows:

Place the component in your markup:

```html
<div class="CoveoVariantFacetManager" data-parent-query="@objecttype==house" data-child-query="@objecttype==rating" data-id-field="@myhouseid"></div>
```

## Extending

Extending the component can be done as follows:

```javascript
import { VariantFacetManager, IVariantFacetManagerOptions } from "@coveops/variant-facet";

export interface IExtendedVariantFacetManagerOptions extends IVariantFacetManagerOptions {}

export class ExtendedVariantFacetManager extends VariantFacetManager {}
```

## Contribute

1. Clone the project
2. Copy `.env.dist` to `.env` and update the COVEO_ORG_ID and COVEO_TOKEN fields in the `.env` file to use your Coveo credentials and SERVER_PORT to configure the port of the sandbox - it will use 8080 by default.
3. Build the code base: `npm run build`
4. Serve the sandbox for live development `npm run serve`