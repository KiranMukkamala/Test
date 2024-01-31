
!INC Local Scripts.EAConstants-JScript

/*
 * This code has been included from the default Project Browser template.
 * If you wish to modify this template, it is located in the Config\Script Templates
 * directory of your EA install path.   
 * 
 * Script Name: Add Element Status Diagram Legend
 * Author: Kiran Mukkamala
 * Purpose: To add Element Status diagram legend to the diagrams in a aselected package or element
 * Date: 25.10.2023
 */


function CheckDiagramLegend(Diagram)
{
	var Diagobj as EA.DiagramObject;
	var DiagElement as EA.Element;
	var Diaglegend as EA.Element;
	var addlegend = true;
	// Change the GUID in case of new legend created in 'Lx - Cross-Level/OneParking Legends/Element Status'
	Diaglegend = Repository.GetElementByGuid("{35DB2B88-241A-4e7e-9A08-0666AA51D10B}");

	
	//Check if the Element Status legend is already present in the diagram
	if (Diagram.DiagramObjects.Count > 0)
	{
		for (var k=0; k < Diagram.DiagramObjects.Count; k ++)
		{
			Diagobj = Diagram.DiagramObjects.GetAt(k);
			DiagElement = Repository.GetElementByID(Diagobj.ElementID);
			
			if(DiagElement != null)
			{
							
				if (DiagElement.ElementGUID == "{35DB2B88-241A-4e7e-9A08-0666AA51D10B}")
				{
					addlegend = false;
					Session.Output("Diagram "+ Diagram.Name +" already has Element Status legend.");
				}
			}

		}
		
	}

	if (addlegend)
	{
			
		diagramObjects = Diagram.DiagramObjects;
		diagramObject = diagramObjects.AddNew("l=1050; r=1250; t=50; b=175;", "");
		if(Diaglegend != null)
		{
			diagramObject.ElementID = Diaglegend.ElementID;
			diagramObject.Update();
			Session.Output("Diagram "+ Diagram.Name +" has been updated with Element Status legend.");
		}
		else
		{
			Session.Output("Diagram "+ Diagram.Name +" could not be updated with Element Status legend.");
		}
	}	
}
 
 function ExploreElement(Element, spacecount)
 {
	var ele as EA.Element;
	var Diag as EA.Diagram;
	var sample as EA.Element;
	
	//Check for Sub Elements
	for (var i=0; i< Element.Elements.Count;i++)
	{
		ele = Element.Elements.GetAt(i);	
		
		if (ele.Elements.Count > 0)
		{
			ExploreElement(ele, spacecount+1);
		}
	}
	
	for (var j=0; j< Element.Diagrams.Count;j++)
	{
		Diag = Element.Diagrams.GetAt(j);
		
		CheckDiagramLegend(Diag);
	}
 }

 function Process_Package(parentPackage, level)
 {
	var PkgList as EA.Collection;
	PkgList = parentPackage.Packages;
	var pkg as EA.Package;
	var subpkg as EA.Package;
		
	if (parentPackage.Elements.Count > 0)
	{
		for (var j=0; j< parentPackage.Elements.Count;j++)
		{
			ExploreElement(parentPackage.Elements.GetAt(j), level+1);
		}
	}
	
	if (PkgList.Count > 0)
	{
//		Session.Output("No.of Sub Packages in Package selected is  :: " + PkgList.Count);
		
		for (var i=0; i< PkgList.Count;i++)
		{
			pkg = PkgList.GetAt(i);
			var SubElementList as EA.Collection;
			
			if (pkg.Element.Type == "Package")
			{
				Process_Package(pkg, level+1);
			}
		}
	}
 }
 
/*
 * Project Browser Script main function
 */
function OnProjectBrowserScript()
{
	// Get the type of element selected in the Project Browser
	var treeSelectedType = Repository.GetTreeSelectedItemType();

	Session.Output(" <======== Starting Add Element Status Diagram Legend script ========> ");
	
	// Handling Code: Uncomment any types you wish this script to support
	// NOTE: You can toggle comments on multiple lines that are currently
	// selected with [CTRL]+[SHIFT]+[C].
	switch ( treeSelectedType )
	{
		case otElement :
		{
			// Code for when an element is selected
			var theElement as EA.Element;
			theElement = Repository.GetTreeSelectedObject();
			Session.Output("Element :: " + theElement.Name + ", Element Type :: " + theElement.Stereotype + ", Sub Element Count :: " + theElement.Elements.Count);
			if (theElement.Elements.Count > 0)
				{
					ExploreElement(theElement, 1);
				}
			break;
		}
		case otPackage :
		{
			// Code for when a package is selected
			var thePackage as EA.Package;
			thePackage = Repository.GetTreeSelectedObject();
			var ElementList as EA.Collection;
			ElementList = thePackage.Elements;
			Session.Output("Package selected is:: " + thePackage.Name + " No.of SubPackages in Package selected is :: " + thePackage.Packages.Count + " No.of Elements in Package selected is :: " + ElementList.Count);
			var ele as EA.Element;
			for (var i=0; i< ElementList.Count;i++)
			{
				ele = ElementList.GetAt(i);
				ExploreElement(ele, ele.Stereotype, ele.Elements, 1);
			}
			
			// For All Packages
			var PkgList as EA.Collection;
			PkgList = thePackage.Packages;
			var pkg as EA.Package;
			var subpkg as EA.Package;
			
			for (var i=0; i< PkgList.Count;i++)
			{
				pkg = PkgList.GetAt(i);
				var SubElementList as EA.Collection;
				
				Process_Package(pkg, 1);
			
			}
			
			break;
		}
		case otDiagram :
		{
			// Code for when a diagram is selected
			var theDiagram as EA.Diagram;
			theDiagram = Repository.GetTreeSelectedObject();
			Session.Output("Diagram selected is  :: " + theDiagram.Name);
			CheckDiagramLegend(theDiagram);
			break;
		}
		case otAttribute :
		{
			// Code for when an attribute is selected
			var theAttribute as EA.Attribute;
			theAttribute = Repository.GetTreeSelectedObject();
			Session.Output("Attribute selected is  :: " + theAttribute.Name + " Not Applicable for this script.");	
			break;
		}
		case otMethod :
		{
			// Code for when a method is selected
			var theMethod as EA.Method;
			theMethod = Repository.GetTreeSelectedObject();
			Session.Output("Method selected is  :: " + theMethod.Name + " Not Applicable for this script.");	
			break;
		}
		default:
		{
			// Error message
			Session.Prompt( "This script does not support items of this type.", promptOK );
		}
	}
	
	Session.Output(" <======== Add Element Status Diagram Legend script ended========> ");
}

OnProjectBrowserScript();
